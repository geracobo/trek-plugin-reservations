// Reservation surface data route and its response enrichment.
const { json } = require('./utils')

function sdkError(error, fallback) {
  const message = error?.message || String(error)
  const status = /^(BAD_PARAMS|VALIDATION|INVALID)/.test(message)
    ? 400
    : /^(RESOURCE_FORBIDDEN|FORBIDDEN|UNAUTHORIZED)/.test(message)
      ? 403
      : 500
  return json(status, { error: status === 500 ? fallback : message.replace(/^[A-Z_]+:\s*/, '') })
}

function enrichReservations(reservations, places, files) {
  const placeById = new Map(
    (Array.isArray(places) ? places : [])
      .filter((place) => place && place.id != null)
      .map((place) => [Number(place.id), place]),
  )
  return (Array.isArray(reservations) ? reservations : []).map((reservation) => {
    if (!reservation || typeof reservation !== 'object') return reservation
    const place = reservation.place_id == null ? null : placeById.get(Number(reservation.place_id))
    const reservationFiles = (Array.isArray(files) ? files : []).filter(
      (file) =>
        file &&
        typeof file === 'object' &&
        (Number(file.reservation_id) === Number(reservation.id) ||
          (Array.isArray(file.linked_reservation_ids) &&
            file.linked_reservation_ids.some((id) => Number(id) === Number(reservation.id)))),
    )
    return place
      ? {
          ...reservation,
          place_name: reservation.place_name || place.name || null,
          location: reservation.location || place.address || null,
          files: reservationFiles,
        }
      : { ...reservation, files: reservationFiles }
  })
}

async function reservationsHandler(req, ctx) {
  const tripId = Number(req.query.tripId)
  if (!Number.isInteger(tripId) || tripId <= 0) return json(400, { error: 'tripId is required' })
  if (!req.user) return json(401, { error: 'authentication required' })
  try {
    const trip = await ctx.trips.getById(tripId)
    if (!trip) return json(404, { error: 'trip not found' })
    const reservations = await ctx.trips.getReservations(tripId)
    const [placesResult, daysResult, accommodationsResult, filesResult, costsResult] = await Promise.allSettled([
      ctx.trips.getPlaces(tripId),
      ctx.trips.getDays(tripId),
      ctx.trips.getAccommodations(tripId),
      ctx.files.list(tripId),
      ctx.costs.getByTrip(tripId),
    ])
    const supplemental = [
      ['places', placesResult],
      ['days', daysResult],
      ['accommodations', accommodationsResult],
      ['files', filesResult],
      ['costs', costsResult],
    ]
    const unavailable = supplemental
      .filter(([, result]) => result.status === 'rejected')
      .map(([name, result]) => `${name}: ${result.reason?.message || String(result.reason)}`)
    if (unavailable.length)
      ctx.log.warn(`reservation form data unavailable for trip ${tripId}: ${unavailable.join('; ')}`)
    const values = (result) => (result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [])
    const places = values(placesResult)
    const files = values(filesResult)
    return json(200, {
      trip,
      reservations: enrichReservations(reservations, places, files),
      places,
      days: values(daysResult),
      accommodations: values(accommodationsResult),
      files,
      costs: values(costsResult),
    })
  } catch (error) {
    const message = error && error.message ? error.message : String(error)
    ctx.log.error(`failed to load reservation surface for trip ${tripId}: ${message}`)
    return json(500, { error: `Unable to load reservations: ${message}` })
  }
}

async function saveReservationHandler(req, ctx) {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const tripId = Number(body.tripId)
  const reservationId = body.reservationId == null ? null : Number(body.reservationId)
  const input = body.input && typeof body.input === 'object' ? body.input : null
  const accommodation = body.accommodation && typeof body.accommodation === 'object' ? body.accommodation : null
  if (!Number.isInteger(tripId) || tripId <= 0 || !input || typeof input.title !== 'string' || !input.title.trim())
    return json(400, { error: 'tripId and a reservation title are required' })
  if (reservationId !== null && (!Number.isInteger(reservationId) || reservationId <= 0))
    return json(400, { error: 'reservationId is invalid' })
  try {
    if (!(await ctx.trips.getById(tripId))) return json(404, { error: 'trip not found' })
    const payload = { ...input, title: input.title.trim() }
    if (accommodation) {
      const venue = accommodation.venue && typeof accommodation.venue === 'object' ? accommodation.venue : null
      const fields = {
        place_id: Number(accommodation.place_id),
        start_day_id: Number(accommodation.start_day_id),
        end_day_id: Number(accommodation.end_day_id),
        check_in: accommodation.check_in || null,
        check_in_end: accommodation.check_in_end || null,
        check_out: accommodation.check_out || null,
        confirmation: accommodation.confirmation || null,
      }
      if (!Number.isInteger(fields.place_id) && venue && typeof venue.name === 'string' && venue.name.trim()) {
        const createdPlace = await ctx.places.create(tripId, {
          name: venue.name.trim(),
          address: typeof venue.address === 'string' && venue.address.trim() ? venue.address.trim() : undefined,
        })
        fields.place_id = Number(createdPlace?.id)
      }
      if (
        Number.isInteger(fields.place_id) &&
        Number.isInteger(fields.start_day_id) &&
        Number.isInteger(fields.end_day_id)
      ) {
        const savedAccommodation = accommodation.id
          ? await ctx.accommodations.update(tripId, Number(accommodation.id), fields)
          : await ctx.accommodations.create(tripId, fields)
        if (savedAccommodation && typeof savedAccommodation === 'object' && savedAccommodation.id != null)
          payload.accommodation_id = savedAccommodation.id
      }
    }
    const saved = reservationId
      ? await ctx.reservations.update(tripId, reservationId, payload)
      : await ctx.reservations.create(tripId, payload)
    return json(200, { reservation: saved })
  } catch (error) {
    const message = error && error.message ? error.message : String(error)
    ctx.log.error(`failed to save reservation for trip ${tripId}: ${message}`)
    return json(500, { error: 'Unable to save reservation' })
  }
}

async function deleteReservationHandler(req, ctx) {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const tripId = Number(body.tripId)
  const reservationId = Number(body.reservationId)
  if (!Number.isInteger(tripId) || tripId <= 0 || !Number.isInteger(reservationId) || reservationId <= 0)
    return json(400, { error: 'tripId and reservationId are required' })
  try {
    if (!(await ctx.trips.getById(tripId))) return json(404, { error: 'trip not found' })
    await ctx.reservations.delete(tripId, reservationId)
    return json(200, { deleted: true })
  } catch (error) {
    const message = error && error.message ? error.message : String(error)
    ctx.log.error(`failed to delete reservation ${reservationId} for trip ${tripId}: ${message}`)
    return json(500, { error: 'Unable to delete reservation' })
  }
}

async function saveCostHandler(req, ctx) {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const tripId = Number(body.tripId)
  const costId = body.costId == null ? null : Number(body.costId)
  const input = body.input && typeof body.input === 'object' ? body.input : null
  if (!Number.isInteger(tripId) || tripId <= 0 || !input || typeof input.name !== 'string' || !input.name.trim())
    return json(400, { error: 'tripId and a cost name are required' })
  if (costId !== null && (!Number.isInteger(costId) || costId <= 0)) return json(400, { error: 'costId is invalid' })
  try {
    if (!(await ctx.trips.getById(tripId))) return json(404, { error: 'trip not found' })
    const cost = costId
      ? await ctx.costs.update(tripId, costId, { ...input, name: input.name.trim() })
      : await ctx.costs.create(tripId, { ...input, name: input.name.trim() })
    return json(200, { cost })
  } catch (error) {
    ctx.log.error(`failed to save cost for trip ${tripId}: ${error?.message || String(error)}`)
    return json(500, { error: 'Unable to save cost' })
  }
}

async function deleteCostHandler(req, ctx) {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const tripId = Number(body.tripId)
  const costId = Number(body.costId)
  if (!Number.isInteger(tripId) || tripId <= 0 || !Number.isInteger(costId) || costId <= 0)
    return json(400, { error: 'tripId and costId are required' })
  try {
    if (!(await ctx.trips.getById(tripId))) return json(404, { error: 'trip not found' })
    await ctx.costs.delete(tripId, costId)
    return json(200, { deleted: true })
  } catch (error) {
    ctx.log.error(`failed to delete cost ${costId}: ${error?.message || String(error)}`)
    return json(500, { error: 'Unable to delete cost' })
  }
}

async function saveFileHandler(req, ctx) {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const tripId = Number(body.tripId)
  const reservationId = Number(body.reservationId)
  const file = body.file && typeof body.file === 'object' ? body.file : null
  if (!Number.isInteger(tripId) || tripId <= 0 || !Number.isInteger(reservationId) || reservationId <= 0)
    return json(400, { error: 'tripId and reservationId are required' })
  if (!file || typeof file.name !== 'string' || !file.name.trim() || typeof file.content_base64 !== 'string')
    return json(400, { error: 'A file name and content are required' })
  try {
    if (!(await ctx.trips.getById(tripId))) return json(404, { error: 'trip not found' })
    const saved = await ctx.files.create(tripId, {
      name: file.name.trim(),
      content_base64: file.content_base64,
      mimetype: typeof file.mimetype === 'string' ? file.mimetype : undefined,
      reservation_id: reservationId,
    })
    return json(200, { file: saved })
  } catch (error) {
    ctx.log.error(`failed to upload file for reservation ${reservationId}: ${error?.message || String(error)}`)
    return sdkError(error, 'Unable to upload file')
  }
}

async function linkFileHandler(req, ctx) {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const tripId = Number(body.tripId)
  const fileId = Number(body.fileId)
  const reservationId = Number(body.reservationId)
  if (
    !Number.isInteger(tripId) ||
    tripId <= 0 ||
    !Number.isInteger(fileId) ||
    fileId <= 0 ||
    !Number.isInteger(reservationId) ||
    reservationId <= 0
  )
    return json(400, { error: 'tripId, fileId and reservationId are required' })
  try {
    if (!(await ctx.trips.getById(tripId))) return json(404, { error: 'trip not found' })
    await ctx.files.createLink(tripId, fileId, { reservation_id: reservationId })
    const files = await ctx.files.list(tripId)
    const file = files.find((item) => Number(item?.id) === fileId)
    if (!file) return json(404, { error: 'file not found after linking' })
    return json(200, { file })
  } catch (error) {
    ctx.log.error(`failed to link file ${fileId} to reservation ${reservationId}: ${error?.message || String(error)}`)
    return sdkError(error, 'Unable to link file')
  }
}

async function unlinkFileHandler(req, ctx) {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const tripId = Number(body.tripId)
  const fileId = Number(body.fileId)
  const reservationId = Number(body.reservationId)
  if (
    !Number.isInteger(tripId) ||
    tripId <= 0 ||
    !Number.isInteger(fileId) ||
    fileId <= 0 ||
    !Number.isInteger(reservationId) ||
    reservationId <= 0
  )
    return json(400, { error: 'tripId, fileId and reservationId are required' })
  try {
    if (!(await ctx.trips.getById(tripId))) return json(404, { error: 'trip not found' })
    const files = await ctx.files.list(tripId)
    const file = files.find((item) => Number(item?.id) === fileId)
    if (!file) return json(404, { error: 'file not found' })
    if (Number(file.reservation_id) !== reservationId)
      return json(409, { error: 'This linked file cannot be detached through the plugin' })
    const updated = await ctx.files.update(tripId, fileId, { reservation_id: null })
    return json(200, { file: updated })
  } catch (error) {
    ctx.log.error(
      `failed to detach file ${fileId} from reservation ${reservationId}: ${error?.message || String(error)}`,
    )
    return sdkError(error, 'Unable to detach file')
  }
}

module.exports = {
  reservationsHandler,
  saveReservationHandler,
  deleteReservationHandler,
  saveCostHandler,
  deleteCostHandler,
  saveFileHandler,
  linkFileHandler,
  unlinkFileHandler,
}

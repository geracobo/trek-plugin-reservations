// Reservation surface data route and its response enrichment.
const { json } = require('./utils')

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
    const [placesResult, daysResult, accommodationsResult, filesResult] = await Promise.allSettled([
      ctx.trips.getPlaces(tripId),
      ctx.trips.getDays(tripId),
      ctx.trips.getAccommodations(tripId),
      ctx.files.list(tripId),
    ])
    const supplemental = [
      ['places', placesResult],
      ['days', daysResult],
      ['accommodations', accommodationsResult],
      ['files', filesResult],
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
    })
  } catch (error) {
    const message = error && error.message ? error.message : String(error)
    ctx.log.error(`failed to load reservation surface for trip ${tripId}: ${message}`)
    return json(500, { error: `Unable to load reservations: ${message}` })
  }
}

module.exports = { reservationsHandler }

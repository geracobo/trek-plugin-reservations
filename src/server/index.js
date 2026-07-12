// Built plugin entry - runs in an isolated child process.
const { definePlugin } = require('trek-plugin-sdk')

const json = (status, body) => ({
  status,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

const enrichReservations = (reservations, places, files) => {
  const placeById = new Map(
    (Array.isArray(places) ? places : [])
      .filter((place) => place && place.id != null)
      .map((place) => [Number(place.id), place]),
  )

  return (Array.isArray(reservations) ? reservations : []).map((reservation) => {
    if (!reservation || typeof reservation !== 'object') return reservation
    const placeId = reservation.place_id == null ? null : Number(reservation.place_id)
    const place = placeId ? placeById.get(placeId) : null
    const reservationFiles = (Array.isArray(files) ? files : []).filter((file) => {
      if (!file || typeof file !== 'object') return false
      if (Number(file.reservation_id) === Number(reservation.id)) return true
      return (
        Array.isArray(file.linked_reservation_ids) &&
        file.linked_reservation_ids.some((id) => Number(id) === Number(reservation.id))
      )
    })

    if (!place) return { ...reservation, files: reservationFiles }
    return {
      ...reservation,
      place_name: reservation.place_name || place.name || null,
      location: reservation.location || place.address || null,
      files: reservationFiles,
    }
  })
}

module.exports = definePlugin({
  async onLoad(ctx) {
    ctx.log.info('reservations plugin loaded')
  },
  routes: [
    {
      method: 'GET',
      path: '/reservations',
      auth: true,
      async handler(req, ctx) {
        const tripId = Number(req.query.tripId)
        if (!Number.isInteger(tripId) || tripId <= 0) return json(400, { error: 'tripId is required' })
        if (!req.user) return json(401, { error: 'authentication required' })

        try {
          // This membership-checked read is also the authorization gate for all
          // remaining trip data. The SDK binds the request user automatically.
          const trip = await ctx.trips.getById(tripId)
          if (!trip) return json(404, { error: 'trip not found' })

          // Reservations are required for this page. The other collections enrich
          // the upcoming create/edit form and should not make the page unavailable.
          const reservations = await ctx.trips.getReservations(tripId)
          const [placesResult, daysResult, accommodationsResult, filesResult] = await Promise.allSettled([
            ctx.trips.getPlaces(tripId),
            ctx.trips.getDays(tripId),
            ctx.trips.getAccommodations(tripId),
            ctx.files.list(tripId),
          ])

          const supplementalResults = [
            ['places', placesResult],
            ['days', daysResult],
            ['accommodations', accommodationsResult],
            ['files', filesResult],
          ]
          const unavailable = supplementalResults
            .filter(([, result]) => result.status === 'rejected')
            .map(([name, result]) => `${name}: ${result.reason?.message || String(result.reason)}`)
          if (unavailable.length > 0)
            ctx.log.warn(`reservation form data unavailable for trip ${tripId}: ${unavailable.join('; ')}`)

          const places =
            placesResult.status === 'fulfilled' && Array.isArray(placesResult.value) ? placesResult.value : []
          const days = daysResult.status === 'fulfilled' && Array.isArray(daysResult.value) ? daysResult.value : []
          const accommodations =
            accommodationsResult.status === 'fulfilled' && Array.isArray(accommodationsResult.value)
              ? accommodationsResult.value
              : []
          const files = filesResult.status === 'fulfilled' && Array.isArray(filesResult.value) ? filesResult.value : []

          return json(200, {
            trip,
            reservations: enrichReservations(reservations, places, files),
            places,
            days,
            accommodations,
            files,
          })
        } catch (error) {
          const message = error && error.message ? error.message : String(error)
          ctx.log.error(`failed to load reservation surface for trip ${tripId}: ${message}`)
          return json(500, { error: `Unable to load reservations: ${message}` })
        }
      },
    },
  ],
})

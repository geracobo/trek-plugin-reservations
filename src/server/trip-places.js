// Search locations that are already part of the active trip.
const { json } = require('./utils')

async function tripPlacesSearchHandler(req, ctx) {
  const tripId = Number(req.query.tripId)
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (!Number.isInteger(tripId) || tripId <= 0) return json(400, { error: 'tripId is required' })
  if (query.length < 2) return json(400, { error: 'Search query must be at least 2 characters' })
  if (query.length > 200) return json(400, { error: 'Search query is too long' })
  try {
    if (!(await ctx.trips.getById(tripId))) return json(404, { error: 'trip not found' })
    const normalizedQuery = query.toLocaleLowerCase()
    const places = (await ctx.trips.getPlaces(tripId))
      .filter((place) => `${place.name || ''} ${place.address || ''}`.toLocaleLowerCase().includes(normalizedQuery))
      .slice(0, 5)
      .map((place) => ({
        osm_id: `trip:${place.id}`,
        name: place.name || place.address || `Place ${place.id}`,
        address: place.address || '',
        lat: place.lat ?? null,
        lng: place.lng ?? null,
        source: 'trip',
      }))
    return json(200, { places, source: 'trip' })
  } catch (error) {
    const message = error && error.message ? error.message : String(error)
    ctx.log.warn(`trip-place search failed for trip ${tripId}: ${message}`)
    return json(502, { error: 'Trip-place search is temporarily unavailable' })
  }
}

module.exports = { tripPlacesSearchHandler }

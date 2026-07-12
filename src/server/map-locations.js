// World-place providers and the plugin-owned map-location search route.
const { json } = require('./utils')

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_MIN_INTERVAL_MS = 1000
const NOMINATIM_CACHE_TTL_MS = 5 * 60 * 1000
const NOMINATIM_CACHE_MAX_ENTRIES = 100
const nominatimCache = new Map()
let nominatimNextRequestAt = 0

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function searchNominatim(query, language, type) {
  const cacheKey = `${query}\u0000${language}\u0000${type}`
  const cached = nominatimCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.places

  const waitMs = Math.max(0, nominatimNextRequestAt - Date.now())
  nominatimNextRequestAt = Math.max(nominatimNextRequestAt, Date.now()) + NOMINATIM_MIN_INTERVAL_MS
  if (waitMs) await delay(waitMs)

  const params = new URLSearchParams({
    q: type ? `${query} ${type.replace(/_/g, ' ')}` : query,
    format: 'json',
    addressdetails: '1',
    limit: '10',
  })
  if (language) params.set('accept-language', language)
  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'user-agent': 'TREK Reservations Plugin/1.0' },
  })
  if (!response.ok) throw new Error(`Nominatim search returned ${response.status}`)

  const results = await response.json()
  if (!Array.isArray(results)) return []
  const places = results.map((place) => ({
    osm_id: `${place.osm_type}:${place.osm_id}`,
    name: place.name || String(place.display_name || '').split(',')[0] || '',
    address: place.display_name || '',
    lat: Number.parseFloat(place.lat) || null,
    lng: Number.parseFloat(place.lon) || null,
    source: 'openstreetmap',
  }))
  if (nominatimCache.size >= NOMINATIM_CACHE_MAX_ENTRIES) nominatimCache.delete(nominatimCache.keys().next().value)
  nominatimCache.set(cacheKey, { places, expiresAt: Date.now() + NOMINATIM_CACHE_TTL_MS })
  return places
}

async function searchGooglePlaces(query, language, type, strictTypeFiltering, apiKey) {
  const body = { textQuery: query, languageCode: language || 'en' }
  if (type) {
    body.includedType = type
    body.strictTypeFiltering = strictTypeFiltering
  }
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
      'x-goog-fieldmask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Google Places search returned ${response.status}`)

  const data = await response.json()
  return (Array.isArray(data.places) ? data.places : []).map((place) => ({
    google_place_id: place.id || null,
    name: place.displayName?.text || '',
    address: place.formattedAddress || '',
    lat: Number(place.location?.latitude) || null,
    lng: Number(place.location?.longitude) || null,
    types: Array.isArray(place.types) ? place.types : [],
    source: 'google',
  }))
}

async function mapLocationsHandler(req, ctx) {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const tripId = Number(body.tripId)
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  const language = typeof body.language === 'string' ? body.language.trim().slice(0, 20) : ''
  const type = typeof body.type === 'string' && /^[a-z_]{1,80}$/.test(body.type) ? body.type : ''
  const strictTypeFiltering = body.strictTypeFiltering === true
  const sources = Array.isArray(body.sources)
    ? body.sources.filter((source) => source === 'google' || source === 'nominatim')
    : ['google', 'nominatim']
  if (!Number.isInteger(tripId) || tripId <= 0) return json(400, { error: 'tripId is required' })
  if (query.length < 3) return json(400, { error: 'Search query must be at least 3 characters' })
  if (query.length > 200) return json(400, { error: 'Search query is too long' })

  try {
    if (!(await ctx.trips.getById(tripId))) return json(404, { error: 'trip not found' })
    const apiKey = typeof ctx.config.googlePlacesApiKey === 'string' ? ctx.config.googlePlacesApiKey.trim() : ''
    if (apiKey && sources.includes('google')) {
      return json(200, {
        places: await searchGooglePlaces(query, language, type, strictTypeFiltering, apiKey),
        source: 'google',
      })
    }
    if (!sources.includes('nominatim')) return json(503, { error: 'No map-location provider is configured' })
    return json(200, { places: await searchNominatim(query, language, type), source: 'openstreetmap' })
  } catch (error) {
    const message = error && error.message ? error.message : String(error)
    ctx.log.warn(`place search failed for trip ${tripId}: ${message}`)
    return json(502, { error: 'Place search is temporarily unavailable' })
  }
}

module.exports = { mapLocationsHandler }

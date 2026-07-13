// Transitous/MOTIS proxy used by the automated-transit editor. Keep this
// server-side: Transitous requests an identifying User-Agent and the browser
// should not be coupled to its response schema.
const { json } = require('./utils')
const tzLookup = require('./vendor/tz-lookup')

const BASE_URL = 'https://api.transitous.org'
const CACHE_TTL_MS = 60_000
const cache = new Map()
const ALLOWED_MODES = new Set([
  'TRANSIT',
  'BUS',
  'COACH',
  'TRAM',
  'SUBWAY',
  'RAIL',
  'FERRY',
  'FUNICULAR',
  'AERIAL_LIFT',
  'HIGHSPEED_RAIL',
  'LONG_DISTANCE',
  'NIGHT_RAIL',
  'REGIONAL_RAIL',
  'SUBURBAN',
])

function cached(key, load) {
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.value
  return load().then((value) => {
    if (cache.size >= 200) cache.delete(cache.keys().next().value)
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
    return value
  })
}

async function upstream(path, params) {
  const response = await fetch(`${BASE_URL}${path}?${params}`, {
    headers: { accept: 'application/json', 'user-agent': 'TREK Reservations Plugin/1.0' },
  })
  if (!response.ok) throw new Error(`Transit provider returned ${response.status}`)
  return response.json()
}

function coordinate(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function color(value) {
  if (typeof value !== 'string') return null
  const hex = value.trim().replace(/^#/, '')
  return /^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex) ? `#${hex}` : null
}

function timezoneAt(lat, lng) {
  try {
    return tzLookup(lat, lng)
  } catch {
    return 'UTC'
  }
}

function localTime(value, lat, lng) {
  if (!value) return null
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezoneAt(lat, lng),
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(value))
  } catch {
    return null
  }
}

async function transitSearchHandler(req, ctx) {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const tripId = Number(body.tripId)
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  if (!Number.isInteger(tripId) || tripId <= 0) return json(400, { error: 'tripId is required' })
  if (query.length < 2 || query.length > 200)
    return json(400, { error: 'Search query must be between 2 and 200 characters' })
  try {
    if (!(await ctx.trips.getById(tripId))) return json(404, { error: 'trip not found' })
    const params = new URLSearchParams({ text: query })
    const raw = await cached(`geocode:${params}`, () => upstream('/api/v1/geocode', params))
    const places = (Array.isArray(raw) ? raw : []).slice(0, 8).flatMap((place) => {
      const lat = coordinate(place?.lat)
      const lng = coordinate(place?.lon)
      if (!place?.name || lat === null || lng === null) return []
      return [
        {
          name: place.name,
          lat,
          lng,
          area: place.areas?.find((item) => item?.default)?.name || place.areas?.[0]?.name || null,
        },
      ]
    })
    return json(200, { places })
  } catch (error) {
    ctx.log.warn(`transit place search failed: ${error?.message || String(error)}`)
    return json(502, { error: 'Transit place search is temporarily unavailable' })
  }
}

async function transitPlanHandler(req, ctx) {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const tripId = Number(body.tripId)
  const from = body.from && typeof body.from === 'object' ? body.from : null
  const to = body.to && typeof body.to === 'object' ? body.to : null
  const time = typeof body.time === 'string' ? body.time : ''
  const arriveBy = body.arriveBy === true
  const modes = typeof body.modes === 'string' ? body.modes : ''
  const fromLat = coordinate(from?.lat)
  const fromLng = coordinate(from?.lng)
  const toLat = coordinate(to?.lat)
  const toLng = coordinate(to?.lng)
  if (!Number.isInteger(tripId) || tripId <= 0) return json(400, { error: 'tripId is required' })
  if (fromLat === null || fromLng === null || toLat === null || toLng === null)
    return json(400, { error: 'Choose both transit locations' })
  if (time && Number.isNaN(new Date(time).getTime())) return json(400, { error: 'Invalid departure time' })
  try {
    if (!(await ctx.trips.getById(tripId))) return json(404, { error: 'trip not found' })
    const params = new URLSearchParams({
      fromPlace: `${fromLat},${fromLng}`,
      toPlace: `${toLat},${toLng}`,
      numItineraries: '8',
      directModes: 'WALK',
    })
    if (time) params.set('time', new Date(time).toISOString())
    if (arriveBy) params.set('arriveBy', 'true')
    if (modes) {
      const requestedModes = modes
        .split(',')
        .map((mode) => mode.trim().toUpperCase())
        .filter(Boolean)
      if (!requestedModes.length || requestedModes.some((mode) => !ALLOWED_MODES.has(mode)))
        return json(400, { error: 'Unsupported transit mode' })
      params.set('transitModes', requestedModes.join(','))
    }
    const raw = await cached(`plan:${params}`, () => upstream('/api/v6/plan', params))
    const itineraries = (Array.isArray(raw?.itineraries) ? raw.itineraries : []).flatMap((itinerary) => {
      if (!itinerary?.startTime || !itinerary?.endTime || !Array.isArray(itinerary.legs)) return []
      const legs = itinerary.legs.map((leg) => {
        const fromLat = coordinate(leg?.from?.lat)
        const fromLng = coordinate(leg?.from?.lon)
        const toLat = coordinate(leg?.to?.lat)
        const toLng = coordinate(leg?.to?.lon)
        return {
          mode: String(leg?.mode || 'WALK').toUpperCase(),
          line: leg?.routeShortName || leg?.displayName || null,
          line_color: color(leg?.routeColor),
          line_text_color: color(leg?.routeTextColor),
          headsign: leg?.headsign || null,
          agency: leg?.agencyName || null,
          duration: Number(leg?.duration) || 0,
          stops: Array.isArray(leg?.intermediateStops) ? leg.intermediateStops.length : 0,
          from: {
            name: leg?.from?.name || '',
            lat: fromLat,
            lng: fromLng,
            time: localTime(leg?.from?.departure, fromLat ?? 0, fromLng ?? 0),
            track: leg?.from?.track || null,
          },
          to: {
            name: leg?.to?.name || '',
            lat: toLat,
            lng: toLng,
            time: localTime(leg?.to?.arrival, toLat ?? 0, toLng ?? 0),
            track: leg?.to?.track || null,
          },
          geometry: leg?.legGeometry?.points || null,
          geometry_precision: leg?.legGeometry?.precision ?? 6,
        }
      })
      return [
        {
          start_time: itinerary.startTime,
          end_time: itinerary.endTime,
          duration: Math.max(
            0,
            Math.round((new Date(itinerary.endTime).getTime() - new Date(itinerary.startTime).getTime()) / 1000),
          ),
          transfers: Number.isFinite(itinerary.transfers)
            ? itinerary.transfers
            : Math.max(0, legs.filter((leg) => leg.mode !== 'WALK').length - 1),
          walk_seconds: legs.filter((leg) => leg.mode === 'WALK').reduce((total, leg) => total + leg.duration, 0),
          legs,
        },
      ]
    })
    return json(200, { itineraries })
  } catch (error) {
    ctx.log.warn(`transit plan failed: ${error?.message || String(error)}`)
    return json(502, { error: 'Transit planning is temporarily unavailable' })
  }
}

module.exports = { transitSearchHandler, transitPlanHandler }

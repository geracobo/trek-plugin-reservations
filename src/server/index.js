// Built plugin entry - runs in an isolated child process.
const { definePlugin } = require('trek-plugin-sdk');

const json = (status, body) => ({
  status,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const toTripId = (value) => {
  const tripId = Number(value);
  return Number.isInteger(tripId) && tripId > 0 ? tripId : null;
};

const enrichReservations = (reservations, places, files) => {
  const placeById = new Map(
    (Array.isArray(places) ? places : [])
      .filter((place) => place && place.id != null)
      .map((place) => [Number(place.id), place]),
  );

  return (Array.isArray(reservations) ? reservations : []).map((reservation) => {
    if (!reservation || typeof reservation !== 'object') return reservation;
    const placeId = reservation.place_id == null ? null : Number(reservation.place_id);
    const place = placeId ? placeById.get(placeId) : null;
    const reservationFiles = (Array.isArray(files) ? files : []).filter((file) => {
      if (!file || typeof file !== 'object') return false;
      if (Number(file.reservation_id) === Number(reservation.id)) return true;
      return Array.isArray(file.linked_reservation_ids)
        && file.linked_reservation_ids.some((id) => Number(id) === Number(reservation.id));
    });

    if (!place) return { ...reservation, files: reservationFiles };
    return {
      ...reservation,
      place_name: reservation.place_name || place.name || null,
      location: reservation.location || place.address || null,
      files: reservationFiles,
    };
  });
};

module.exports = definePlugin({
  async onLoad(ctx) {
    ctx.log.info('reservations plugin loaded');
  },
  routes: [
    {
      method: 'GET',
      path: '/reservations',
      auth: true,
      async handler(req, ctx) {
        const tripId = toTripId(req.query.tripId);
        if (!tripId) return json(400, { error: 'tripId is required' });
        if (!req.user) return json(401, { error: 'authentication required' });
        // SDK 1.3.1's standalone dev host still requires the legacy acting-user
        // argument. Production TREK binds the request user and ignores this value.
        const actingUserId = Number(req.user.id);

        const [trip, reservations, files] = await Promise.all([
          ctx.trips.getById(tripId, actingUserId),
          ctx.trips.getReservations(tripId, actingUserId),
          // SDK 1.3.1 does not expose ctx.files in its standalone dev context.
          ctx.files && typeof ctx.files.list === 'function' ? ctx.files.list(tripId) : [],
        ]);


        if (!trip) return json(404, { error: 'trip not found' });

        let places = [];
        try {
          const result = await ctx.trips.getPlaces(tripId, actingUserId);
          places = Array.isArray(result) ? result : [];
        } catch (error) {
          ctx.log.warn('place enrichment unavailable; returning raw reservations', {
            tripId,
            error: error && error.message ? error.message : String(error),
          });
        }

        return json(200, {
          trip,
          reservations: enrichReservations(reservations, places, files),
          places,
        });
      },
    },
  ],
});

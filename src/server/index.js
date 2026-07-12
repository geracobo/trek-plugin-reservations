// Built plugin entry — keep composition here; route logic lives beside it.
const { definePlugin } = require('trek-plugin-sdk')
const { reservationsHandler, saveReservationHandler } = require('./reservations')
const { mapLocationsHandler } = require('./map-locations')

module.exports = definePlugin({
  async onLoad(ctx) {
    ctx.log.info('reservations plugin loaded')
  },
  routes: [
    { method: 'GET', path: '/reservations', auth: true, handler: reservationsHandler },
    { method: 'POST', path: '/reservations/save', auth: true, handler: saveReservationHandler },
    { method: 'POST', path: '/map-locations', auth: true, handler: mapLocationsHandler },
  ],
})

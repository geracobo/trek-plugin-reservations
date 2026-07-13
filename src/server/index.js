// Built plugin entry — keep composition here; route logic lives beside it.
const { definePlugin } = require('trek-plugin-sdk')
const {
  reservationsHandler,
  saveReservationHandler,
  deleteReservationHandler,
  saveCostHandler,
  deleteCostHandler,
  saveFileHandler,
  linkFileHandler,
  unlinkFileHandler,
} = require('./reservations')
const { mapLocationsHandler } = require('./map-locations')
const { tripPlacesSearchHandler } = require('./trip-places')
const { transitSearchHandler, transitPlanHandler } = require('./transit')

module.exports = definePlugin({
  async onLoad(ctx) {
    ctx.log.info('reservations plugin loaded')
  },
  routes: [
    { method: 'GET', path: '/reservations', auth: true, handler: reservationsHandler },
    { method: 'POST', path: '/reservations/save', auth: true, handler: saveReservationHandler },
    { method: 'DELETE', path: '/reservations', auth: true, handler: deleteReservationHandler },
    { method: 'POST', path: '/costs/save', auth: true, handler: saveCostHandler },
    { method: 'DELETE', path: '/costs', auth: true, handler: deleteCostHandler },
    { method: 'POST', path: '/files/save', auth: true, handler: saveFileHandler },
    { method: 'POST', path: '/files/link', auth: true, handler: linkFileHandler },
    { method: 'DELETE', path: '/files/link', auth: true, handler: unlinkFileHandler },
    { method: 'POST', path: '/map-locations', auth: true, handler: mapLocationsHandler },
    { method: 'GET', path: '/trip-places', auth: true, handler: tripPlacesSearchHandler },
    { method: 'POST', path: '/transit/search', auth: true, handler: transitSearchHandler },
    { method: 'POST', path: '/transit/plan', auth: true, handler: transitPlanHandler },
  ],
})

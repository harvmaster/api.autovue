'use strict'

const express = require('express')
const router = express.Router()

/**
 * Root Route
 * @memberof Routes
 *
 */
class RootRoute {
  constructor () {
    router.use('/', require('./users'))
    router.use('/spotify', require('./spotify'))

    return router
  }
}

module.exports = new RootRoute()

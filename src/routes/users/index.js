'use strict'

const express = require('express')
const router = express.Router()

/**
  * Upload Management routes
  * @memberof Routes
  */
class UploadRoute {
  constructor () {
    router.post('/', (req, res) => this.get())
	  router.get('/', (req, res) => this.get())
		
		return router
  }

  async get (req, res) {

	}

  async getFile (req, res) {

  }
 
}

module.exports = new UploadRoute()

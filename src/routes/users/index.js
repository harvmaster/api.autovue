'use strict'

const express = require('express')
const router = express.Router()
const Connections = require('../../models/connection')

/**
  * Upload Management routes
  * @memberof Routes
  */
class Route {
  constructor () {
    router.post('/', (req, res) => this.get())
	  router.get('/position', (req, res) => this.get(req, res))
		
		return router
  }

  async get (req, res) {
    const connections = await Connections.find()
    console.log(connections)
    // const promises = connections.map(async (connection, i) => {
    //   connection.priority = {
    //     prev: (connections[i-1] || null),
    //     next: (connections[i+1] || null)
    //   }
    //   await connection.save()
    //   return connection
    // })
    // Promise.all(promises).then(results => {
    //   res.send(results)
    // })
    const formatted = connections.map(connection => { return { address: connection.address, priority: connection.priority }})
    res.send(formatted)

	}

  async getFile (req, res) {

  }
 
}

module.exports = new Route()

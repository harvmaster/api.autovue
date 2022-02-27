//https://api.lyrics.ovh/v1
'use strict'

const express = require('express')
const router = express.Router()
const axios = require('axios')
const fs = require('fs')

class Route {
  constructor () {
    router.get('/:artist/:title', (req, res) => this.getLyrics)

    return router
  }

  async getLyrics (req, res) {
    // check if its in db
    // get from source
    // 
  }
}

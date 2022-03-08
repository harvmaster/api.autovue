//https://api.lyrics.ovh/v1
'use strict'

const express = require('express')
const router = express.Router()
const axios = require('axios')
const fs = require('fs')

const Lyrics = require('../../models/lyrics')

class Route {
  constructor () {
    router.get('/:artist/:title', (req, res) => this.getLyrics(req, res))

    this.blacklist = []
    return router
  }

  async getLyrics (req, res) {
    // check if its in db
    // get from source
    // 
    const { title, artist } = req.params
    const { duration } = req.query

    if (this.blacklist.includes(`${title}@${artist}`)) return res.send()

    const dbLyric = await Lyrics.findOne({ name: title, artist: artist })

    if (!dbLyric) {
      try {
        await Lyrics.downloadLyrics(title, artist, duration)
      } catch (err) {
        // console.error(err.repsonse.data)
        console.error(`Could not get lyrics for ${title} by ${artist}`)
        this.blacklistSong(title, artist)
        return res.send()
      }
      return res.redirect(`http://raspberrypi.local:3000/lyrics/${artist}/${title}`)
    }

    return res.send(dbLyric.lyrics)
  }
  
  async blacklistSong (title, artist) {
    const index = this.blacklist.length
    const combined = `${title}@${artist}`

    this.blacklist.push(combined)
    setTimeout(() => {
      this.blacklist = this.blacklist.filter(item => item != combined)
    }, 600000)
  }

}


module.exports = new Route()
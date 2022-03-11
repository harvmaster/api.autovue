//https://api.lyrics.ovh/v1
'use strict'

const express = require('express')
const router = express.Router()
const axios = require('axios')
const fs = require('fs')

const Lyrics = require('../../models/lyrics')
const Connection = require('../../models/connection')
const Bluetooth = require('../../services/bluetooth/Manager')

class Route {
  constructor () {
    router.get('/analyze/:artist/:title', (req, res) => this.getAnalysis(req, res))

    router.get('/:artist/:title', (req, res) => this.getLyrics(req, res))

    this.blacklist = []
    return router
  }

  async getLyrics (req, res) {
    const { title, artist } = req.params
    const { duration } = req.query

    const dbLyric = await Lyrics.findOne({ name: title, artist: artist })

    // if we dont have the lyrics already, download them and redirect the request back to here after its done
    if (!dbLyric) {
      try {
        if (this.blacklist.includes(`${title}@${artist}`)) return res.send()
        await Lyrics.downloadLyrics(title, artist, duration)
      } catch (err) {
        console.error(`Could not get lyrics for ${title} by ${artist}`)
        this.blacklistSong(title, artist)
        return res.send()
      }
      return res.redirect(`http://raspberrypi.local:3000/lyrics/${artist}/${title}`)
    }

    return res.send(dbLyric.lyrics)
  }

  async getAnalysis (req, res) {
    const { title, artist } = req.params

    const device = Bluetooth.getConnectedDevice()

    const dbDevice = await Connection.findOne({ address: device.properties.address })
    if (!dbDevice || !dbDevice.spotifyId) return res.status(401).send('No Authentication Token Found')
    const id = dbDevice.spotifyId

    const response = await axios.get('https://spotify.mc.hzuccon.com/spotify/analysis', { params: { title, artist, id } })

    res.send(response.data)
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
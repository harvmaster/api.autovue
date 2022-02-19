'use strict'

const express = require('express')
const router = express.Router()
const axios = require('axios')
const fs = require('fs')

const Bluetooth = require('../../services/bluetooth')
const Connection = require('../../models/connection')

/**
  * Upload Management routes
  * @memberof Routes
  */
class SpotifyRoute {
  constructor () {
    router.get('/test', (req, res) => this.test())
    router.get('/authenticate', (req, res) => this.authenticate(req, res))
	  router.get('/albumcover', (req, res) => this.getAlbumCover(req, res))
		
		return router
  }

  async test () {
    console.log('cum')
    // const res = await axios.get('http://localhost:3000/spotify/albumcover', { params: { track: String('I write sins not tragedies'), artist: String('Panic! At The Disco') }}).catch(err => res.send(err))
    // console.log(res)
  }

  // I dont know if its safe to assume, BUT
  // We are going to attach the spotify code to the connected device
  async authenticate (req, res) {
    const { id } = req.query
    // Get the current device
    const device = Bluetooth.getConnectedDevice()
    // Check if its in the database
    let dbDevice = await Connection.findOne({ address: device.properties.address })
    if (!!dbDevice) {
      dbDevice.spotifyId = id
      await dbDevice.save()
      await device.getSpotifyId()
      return res.send('Successfully Authenticated Spotify')
    }

    dbDevice = new Connection({ address: device.properties.address, spotifyId: id })
    await dbDevice.save()
    await device.getSpotifyId()
    res.send('Successfully Authenticated Spotify')
  }

  async getAlbumCover (req, res) {

    const { track, artist } = req.query
    // Get id of refreshToken
    const id = '620d0e3cefd7e704881c271b'
    console.log(req.query)
   
    // Get from external
    const coverUrls = await axios.get('https://spotify.mc.hzuccon.com/spotify/albumcover', { params: { track: String(track), artist: String(artist), id: String(id) } })
    console.log(coverUrls.data)
    // Get highest resolution
    const best = coverUrls.data.sort((a, b) => b.width - a.width)[0]
    // Get image data
    const imageRes = await axios.get(best.url, { responseType: 'stream' })
    // Save image
    imageRes.data.pipe(fs.createWriteStream(`${__dirname}/../../public/albums/${track.split(' ').join('_')}@${artist.split(' ').join('_')}.jpeg`, err => {
      if (err) throw err
      console.log(`Saved file ${track} ${artist}`)
      res.send(`http://raspberrypi.local:3000/public/albums/${track.split(' ').join('_')}@${artist.split(' ').join('_')}.jpeg`)
    }))
	}

  async getFile (dbTrack) {

  }
 
}

module.exports = new SpotifyRoute()

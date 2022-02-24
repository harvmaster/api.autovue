'use strict'

const express = require('express')
const router = express.Router()
const axios = require('axios')
const fs = require('fs')

const Bluetooth = require('../../services/bluetooth/Manager')
const Connection = require('../../models/connection')

/**
  * Upload Management routes
  * @memberof Routes
  */
class SpotifyRoute {
  constructor () {
    router.get('/test', (req, res) => this.test(req, res))
    router.get('/authenticate', (req, res) => this.authenticate(req, res))
	  router.get('/albumcover', (req, res) => this.getAlbumCover(req, res))
		
		return router
  }

  async test (req, res) {
    console.log('cum')
    const response = await axios.get('http://localhost:3000/spotify/albumcover', { params: { album: String('A Fever I Cant Sweat Out'), artist: String('Panic! At The Disco') }}).catch(err => res.send(err))
    res.redirect(response.data)
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
    } else {
      dbDevice = new Connection({ address: device.properties.address, spotifyId: id })
    }

    await dbDevice.save()
    await device.getSpotifyId()
    res.send('Successfully Authenticated Spotify')
  }

  async getAlbumCover (req, res) {

    const { album, artist } = req.query
    if (!album || !artist) return res.status(400).send('No album or artist given')
    // Check if album art exists
    const albumCheck = await axios.get(`http://raspberrypi.local:3000/public/albums/${album.split(' ').join('_')}@${artist.split(' ').join('_')}.jpeg`).catch(err => { return { } })
    if (!!albumCheck.data) return res.redirect(`http://raspberrypi.local:3000/public/albums/${album.split(' ').join('_')}@${artist.split(' ').join('_')}.jpeg`)

    // Get id of refreshToken
    const device = Bluetooth.getConnectedDevice()
    if (!device) return res.status(428).send('No device currently connected')

    const  dbDevice = await Connection.findOne({ address: device.properties.address })

    if (!dbDevice || !dbDevice.spotifyId) return res.status(401).send('No Authentication Token Found')
    const id = dbDevice.spotifyId
   
    // Get from external
    const coverUrls = await axios.get('https://spotify.mc.hzuccon.com/spotify/albumcover', { params: { album: String(album), artist: String(artist), id: String(id) } })
    
    // Check if it found a cover, else give placeholder image - this should probably be moved to client side
    if (coverUrls.data == 'undefined') return res.redirect('http://raspberrypi.local:3000/public/albums/placeholder.jpeg')
    
    // Get highest resolution
    const best = coverUrls.data.sort((a, b) => b.width - a.width)[0]
    // Get image data
    const imageRes = await axios.get(best.url, { responseType: 'stream' })
    // Save image
    const file = fs.createWriteStream(`${__dirname}/../../public/albums/${album.split(' ').join('_')}@${artist.split(' ').join('_')}.jpeg`)
    imageRes.data.pipe(file)
    file.on('finish', () => {
      console.log(`Saved file ${album.split(' ').join('_')}@${artist.split(' ').join('_')}.jpeg`)
      res.redirect(`http://raspberrypi.local:3000/public/albums/${album.split(' ').join('_')}@${artist.split(' ').join('_')}.jpeg`)
    })
	}

  async getFile (dbTrack) {

  }
 
}

module.exports = new SpotifyRoute()

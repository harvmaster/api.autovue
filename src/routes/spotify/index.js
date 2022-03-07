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
	  router.get('/album/cover', (req, res) => this.getAlbumCover(req, res))
    router.get('/saved/covers', (req, res) => this.getAllSavedCovers(req, res))
		router.get('/album/cover/refresh', (req, res) => this.refreshAlbumCover(req, res))
    router.get('/browse/recommended', (req, res) => this.getRecommended(req, res))

		return router
  }

  async requireBTAuth (req, res, next) {

  }

  async test (req, res) {
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

    let { album, artist } = req.query
    album = album.replace(/[^a-zA-Z0-9]/g, '');
    artist = artist.replace(/[^a-zA-Z0-9]/g, '');

    // Commented area redirects to a png. used when animated placeholder wasnt in use
    if (!album || !artist) return res.status(400).send() //redirect('http://raspberrypi.local:3000/public/albums/placeholder.png')
    
    // Check if album art already exists
    const albumCheck = await axios.get(`http://raspberrypi.local:3000/public/albums/${album}@${artist}.jpeg`).catch(err => { return { } })
    if (!!albumCheck.data) return res.redirect(`http://raspberrypi.local:3000/public/albums/${album}@${artist}.jpeg`)

    // Get id of refreshToken
    const device = Bluetooth.getConnectedDevice()
    if (!device) return res.status(428).send('No device currently connected')

    const dbDevice = await Connection.findOne({ address: device.properties.address })
    if (!dbDevice || !dbDevice.spotifyId) return res.status(401).send('No Authentication Token Found')
    const id = dbDevice.spotifyId
   
    // Get from external
    const coverUrls = await axios.get('https://spotify.mc.hzuccon.com/spotify/albumcover', { params: { album: req.query.album, artist: req.query.artist, id: id } })
    
    // Check if it found a cover, else give placeholder image - this should probably be moved to client side
    if (coverUrls.data == 'undefined') return res.redirect('http://raspberrypi.local:3000/public/albums/placeholder.jpeg')
    
    // Get highest resolution
    const best = coverUrls.data.sort((a, b) => b.width - a.width)[0]
    
    // Save image and return link
    try {
      await this.saveCover(best.url, `${album}@${artist}`)
      res.redirect(`http://raspberrypi.local:3000/public/albums/${album}@${artist}.jpeg`)
    } catch (err) {
      res.send('http://raspberrypi.local:3000/public/albums/placeholder.jpeg')
    }

	}

  async refreshAlbumCover (req, res) {
    let { album, artist } = req.query
    album = album.replace(/[^a-zA-Z0-9]/g, '');
    artist = artist.replace(/[^a-zA-Z0-9]/g, '');

    if (!album || !artist) return res.status(400).send('No album or artist given')

    const imagePath = `${__dirname}/../../public/albums/${album}@${artist}.jpeg`
    fs.unlink(imagePath, () => this.getAlbumCover(req, res))
  }

  async getAllSavedCovers (req, res) {
    // Get id of refreshToken
    const device = Bluetooth.getConnectedDevice()
    if (!device) return res.status(428).send('No device currently connected')

    const dbDevice = await Connection.findOne({ address: device.properties.address })

    if (!dbDevice || !dbDevice.spotifyId) return res.status(401).send('No Authentication Token Found')
    const id = dbDevice.spotifyId

    // Get saved songs
    const savedTracks = await axios.get('https://spotify.mc.hzuccon.com/spotify/saved', { params: { id }})
    if (!savedTracks.data) return res.status(204).send()

    const coverPromises = savedTracks.data.map(async item => {
      let { album } = item.track
      
      let artist = album.artists[0].name
      artist = artist.replace(/[^a-zA-Z0-9]/g, '');
      album = album.name.replace(/[^a-zA-Z0-9]/g, '');
      
      const albumCheck = await axios.get(`http://raspberrypi.local:3000/public/albums/${album}@${artist}.jpeg`).catch(err => { return { } })
      if (!!albumCheck.data) return

      // Get highest resolution
      const best = item.track.album.images.sort((a, b) => b.width - a.width)[0]
      return this.saveCover(best.url, `${ablum}@${artist}`)

    })


  }

  async getRecommended (req, res) {
    const device = Bluetooth.getConnectedDevice()
    if (!device) return res.status(428).send('No device currently connected')

    const dbDevice = await Connection.findOne({ address: device.properties.address })

    if (!dbDevice || !dbDevice.spotifyId) return res.status(401).send('No Authentication Token Found')
    const id = dbDevice.spotifyId

    const response = await axios.get('https://spotify.mc.hzuccon.com/spotify/browse/recommended', { params: { id } }).catch(err => err.status == 504 ? console.log('Gateway error') : console.log(err))
    console.log(response.data)
    res.send(response.data.playlists.items)
  }
  
  
  saveCover (url, name) {
    return new Promise (async (resolve, reject) => {
      
      const imagePath = `${__dirname}/../../public/albums/${name}.jpeg`

      // Get image data
      const imageRes = await axios.get(url, { responseType: 'stream' })
      
      // Save image
      const file = fs.createWriteStream(imagePath)
      imageRes.data.pipe(file)
      file.on('finish', () => {
        console.log(`Saved file ${name}.jpeg`)
        resolve(imagePath)
      })
      file.on('error', err => {
        console.warn(`Could not save ${name}.jpeg`)
        fs.unlink(imagePath, () => console.log(`deleted ${name}}.jpeg`))
      })
    })
    
  }
 
}

module.exports = new SpotifyRoute()

const EventEmitter = require('events')
const dbus = require('dbus-next')
const bus = dbus.systemBus()

const Connections = require('../../models/connection')

const { getInterface } = require('./InterfaceHelper')
const { log, promiseTimeout, cleanDBusProperties, delay } = require('../../resources')

class Device extends EventEmitter {
  
  #obj;
  #interface;
  #media;

  #spotifyId;
  #priority;

  constructor (obj) {
    super()
    
    this.#obj = obj
    this.#media = {}
  }

  async init () {

    // get the interface and properties, also set callbacks for once certain values are updated
    this.#interface = await getInterface(this.#obj, 'org.bluez.Device1', {
      callbacks: {
        'connected': (properties) => {
          this.emit(properties.connected ? 'connected' : 'disconnected', this.properties)
        },
        'paired': (properties) => {
          this.emit(properties.paired ? 'paired' : 'unpaired', this.properties)
        }
      }
    })

    this.#interface.on('propertyChanged', properties => this.emit('device-update', properties))

    log('bluetooth-device', `[${this.properties.address}] Initialised`)

    if (this.properties.connected) {
      this.initMediaPlayer()
      this.initMediaTransport()
    }
    this.getSpotifyId()
    this.getPriority()

  }

  destroy () {
    this.#interface.removeAllListeners()
  }

  get properties () {
    return { ...this.#interface.properties, spotifyId: this.#spotifyId }
  }

  get mediaProperties () {
    const { state, volume } = this.#media?.transporter.properties || {}
    return { ...this.#media?.player?.properties, ...{ state, volume } } || {}
  }

  async initMediaPlayer (itf) {
    log('bluetooth-device', `[${this.properties.address}] Initialising Media Player`)

    // First check if i need to manually find the path
    if (!itf) {
      const mediaControl = await getInterface(this.#obj, 'org.bluez.MediaControl1')
      if (!mediaControl.properties.player) return
      itf = mediaControl.properties.player
    }

    const playerObj = await bus.getProxyObject('org.bluez', itf)
    const playerInterface = await getInterface(playerObj, 'org.bluez.MediaPlayer1', {
      mutators: {
        'track': (value, key) => {
          if (!value.Title) return this.#media?.player?.properties?.track || {}
          return cleanDBusProperties(value)
        }
      }
    })
    this.#media.player = playerInterface
    
    // this.#media.player.on('propertyChanged', properties => console.log(properties))
    this.#media.player.on('propertyChanged', properties => this.emit('player-update', this.mediaProperties))

    log('bluetooth-device', `[${this.properties.address}] Initialised Media Player`)
  }

  async initMediaTransport (itf) {
    log('bluetooth-device', `[${this.properties.address}] Initialising Media Transport`)
    
    // If the device is connected before the program launches, we need to find the interface manually
    if (!itf) {
      const allSepNodes = this.#obj.nodes.filter(node => node.split('/').at(-1).includes('sep'))
    if (!allSepNodes) return log('bluetooth-device', `[${this.properties.address}] Couldn't initialise Media Transport. No interfaces found`)
      const allSepPromises = allSepNodes.map(node => bus.getProxyObject('org.bluez', node))
      const sep = await Promise.all(allSepPromises).then(async seps => {
        return seps.find(sep => sep.nodes.find(node => node.split('/').at(-1).includes('fd')))
      })
      itf = sep.nodes.find(node => node.split('/').at(-1).includes('fd'))
    }
    
    const transportObj = await bus.getProxyObject('org.bluez', itf)
    const transporter = await getInterface(transportObj, 'org.bluez.MediaTransport1')
    this.#media.transporter = transporter

    this.#media.transporter.on('propertyChanged', () => this.emit('player-update', this.mediaProperties))

    log('bluetooth-device', `[${this.properties.address}] Initialised Media Transporter`)
  }

  async dispatchMediaCommand (method, params) {
    method = method.charAt(0).toUpperCase() + method.slice(1)
    if (this.#media.player[method] != null) {
      const res = await this.#media.player[method] ()
      console.log(res)
      return
    }
    if (this.#media.transporter.properties[method.toLowerCase()] != null) {
      this.#media.transporter.properties[method.toLowerCase()] = params
      return
    }
    throw new Error(`Command not found for media instance (${method})`)
  }

  async pair () {
    const pairListener = new Promise ((resolve, reject) => {
      this.once('paired', (properties) => resolve(properties))
    })
    this.#interface.Pair()
  
    const res = await promiseTimeout(
        10000,
        `Could not pair to device ${this.properties.name ? `(${this.properties.name})` : this.properties.address}`,
        pairListener       
      )
  
    return res
  }

  async connect () {
    if (this.properties.connected) return this.properties
    const connectListener = new Promise ((resolve, reject) => {
      this.once('connected', (properties) => resolve(properties))
    })
    try { 
      this.#interface.Connect()
    } catch (err) {
      log('bluetooth-device', `${this.properties.address} could not be connected to right now`)
      return
    }
  
    let res
    try {
      res = await promiseTimeout(
          10000,
          `Could not connect to device ${this.properties.name ? `(${this.properties.name})` : this.properties.address}`,
          connectListener       
        )
    } catch (err) {
      throw err
    }

    const exists = await Connections.findOne({ address: this.properties.address }).exec()
    if (!exists) {
      const connections = await Connections.find()
      const last = connections.find(connection => !connection.priority.next)

      const dbDevice = new Connections({ address: this.properties.address, priority: { prev: last.id } })
      await dbDevice.save()
      console.log('saved device to database')
    }
  
    return res
  }

   async disconnect () {
     if (!this.properties.connected) return
    const disconnectListener = new Promise ((resolve, reject) => {
      this.once('disconnected', (properties) => resolve(properties))
    })
    this.#interface.Disconnect()

    const res = await promiseTimeout(
      10000,
      `Could not disconnect from device ${this.properties.name ? `(${this.properties.name})` : this.properties.address}`,
      disconnectListener       
    )

    return res;
  }

  async getSpotifyId () {
    const device = await Connections.findOne({ address: this.properties.address })
    if (!device) return
    this.#spotifyId = device.spotifyId
    this.emit('propertyChanged', this.properties)
  }

  async getPriority () {
    const device = await Connections.findOne({ address: this.properties.address })
    if (!device) return 
    const priority = await device.getPriority()
    
    this.#priority = priority
    return priority
  }
}

module.exports = Device
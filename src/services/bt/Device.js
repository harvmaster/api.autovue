const EventEmitter = require('events')
const dbus = require('dbus-next')
let bus = dbus.systemBus();

const { promiseTimeout, cleanDBusProperties, cleanDBusPrint } = require('../../resources')
// const { getAlbumCover } = require('../../resources/player')

const { getInterface } = require('./DeviceInterface');
const Connection = require('../../models/connection');

class Device extends EventEmitter{

  #obj;
  #deviceInterface;
  #propertiesInterface;
  #properties;
  #media;
  #spotifyId;


  constructor (obj) {
    super()
    this.#obj = obj
    this.#properties = {}
    this.#media = {}
  }
  
  async init () {
    this.#deviceInterface = this.#obj.getInterface('org.bluez.Device1')

    // Get properties
    this.#propertiesInterface = this.#obj.getInterface('org.freedesktop.DBus.Properties')
    const properties = await this.#propertiesInterface.GetAll('org.bluez.Device1')
    
    // reformat properties and set to #properties field
    Object.keys(properties).forEach(property => {
      this.#properties[property.toLowerCase()] = properties[property].value
    })

    // House keeping because of error (too many listeners)
    this.#propertiesInterface.removeAllListeners('PropertiesChanged')

    // Listen for property changes to update local values
    this.#propertiesInterface.on('PropertiesChanged', (itf, changed, invalidated) => {
      // emit custom events if certain property was changed
      const customEvents = {
        'Connected': (value) => {
          customEvents.default(value, 'connected')
          this.emit(value ? 'connected' : 'disconnected', this.properties)
        },
        'Paired': (value) => {
          customEvents.default(value, 'paired')
          this.emit(value ? 'paired' : 'unpaired', this.properties)
        },
        'default': (value, key) => this.#properties[key] = value
      }

      Object.keys(changed).forEach(property => {
        (customEvents[property] || customEvents.default ) (changed[property].value, property.toLowerCase())
      })
      
      // emit the propertyChanged event
      this.emit('propertyChanged', this.properties)
    })

    // initiate media?
    if (this.#properties.connected) this.initMedia()
    this.getSpotifyId()
  }

  // House keeping
  destroy () {
    this.#propertiesInterface.removeAllListeners()
  }

  get properties () {
    return { ...this.#properties, spotifyId: this.#spotifyId }
  }

  get connected () {
    return this.#properties.Connected
  }

  get Media () {
    return this.#media
  }

  get spotifyId () {
    return this.#spotifyId
  }

  async initMedia () {
    // Contains the node for the player route. if no node, probably a diconnect event or no player is present on the device
    const mediaControl = await getInterface(this.#obj, 'org.bluez.MediaControl1')
    if (!mediaControl.properties.player) return
    
    // Get the bluez player Object
    const PlayerObj = await bus.getProxyObject('org.bluez', mediaControl.properties.player)
    this.#media.obj = PlayerObj
    console.debug(`Media Object set for ${this.properties.address}`)

    // get the Media Player Interface
    // pass it options to handle 'track' differently (middleware?)
    const Player = await getInterface(PlayerObj, 'org.bluez.MediaPlayer1', {
      propertyChanged: {
        'track': function (value, key, next) {
          if (!value.Title) return true
          const reformatted = cleanDBusProperties(value)
          next(reformatted, key)
        }
      }
    })
    this.#media.player = Player
    console.debug(`Media Player set for ${this.properties.address}`)

    // setup player event handler
    this.#media.player.on('propertyChanged', properties => this.emit('player-update', properties))

    // Initialise org.bluez.MediaTransport1
    await this.initMediaTransport()
    console.debug(`Media Transporter set for ${this.properties.address}`)

    //setup transporter event handler
    this.#media.transporter.on('propertyChanged', properties => this.emit('player-update', properties))

  }

  async initMediaTransport () {
    // Get sep1 object that contains the transport node
    // Get the node path for MediaTransport1
    // Get Object for the node
    // Get MediaTransport1 interface
    try {
      const sep = await bus.getProxyObject('org.bluez', `${this.#obj.path}/sep1`)
      const node = sep.nodes.find(node => node.split('/').at(-1).includes('fd'))
      const fdObj = await bus.getProxyObject('org.bluez', node)
      const transporter = await getInterface(fdObj, 'org.bluez.MediaTransport1')
      this.#media.transporter = transporter
    } catch (err) {
      err.description = 'Could not get org.bluez.MediaTransport1'
      throw err
    }
    return this.#media.transporter
  }

  async dispatchMediaCommand (method, params) {
    method = method.charAt(0).toUpperCase() + method.slice(1)
    if (this.#media.player[method] != null) {
      this.#media.player[method] ()
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
    this.#deviceInterface.Pair()
  
    const res = await promiseTimeout(
        10000,
        `Could not pair to device ${this.#properties.name ? `(${this.properties.name})` : this.properties.address}`,
        pairListener       
      )
  
    return res
  }
  
  async connect () {
    if (this.properties.connected) throw 'Device already connected'
    const connectListener = new Promise ((resolve, reject) => {
      this.once('connected', (properties) => resolve(properties))
    })
    this.#deviceInterface.Connect()
  
    let res
    try {
      res = await promiseTimeout(
          10000,
          `Could not connect to device ${this.#properties.name ? `(${this.properties.name})` : this.properties.address}`,
          connectListener       
        )
    } catch (err) {
      throw err
    }
  
    return res
  }

  async disconnect () {
    const disconnectListener = new Promise ((resolve, reject) => {
      this.once('disconnected', (properties) => resolve(properties))
    })
    this.#deviceInterface.Disconnect()

    return true;
  }

  async getSpotifyId () {
    const device = await Connection.findOne({ address: this.properties.address })
    if (!device) return
    this.#spotifyId = device.spotifyId
  }
}

module.exports = Device

    // const netItf = this.#obj.getInterface('org.bluez.Network1')
    // console.log(netItf)

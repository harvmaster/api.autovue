const { debug } = require('console');
const EventEmitter = require('events')
const { promiseTimeout } = require('../../resources')

class Device extends EventEmitter{

  #obj;
  #deviceInterface;
  #propertiesInterface;
  #properties;
  #mediaObj
  #media;

  constructor (obj) {
    super()
    this.#obj = obj
    this.#properties = {}
  }
  
  async init () {
    this.#deviceInterface = this.#obj.getInterface('org.bluez.Device1')

    this.#propertiesInterface = this.#obj.getInterface('org.freedesktop.DBus.Properties')
    const properties = await this.#propertiesInterface.GetAll('org.bluez.Device1')
    
    // reformat properties and set to #properties field
    Object.keys(properties).forEach(property => {
      this.#properties[property.toLowerCase()] = properties[property].value
    })

    console.log(this.#propertiesInterface.listenerCount('PropertiesChanged'))
    this.#propertiesInterface.removeAllListeners('PropertiesChanged')

    this.#propertiesInterface.on('PropertiesChanged', (itf, changed, invalidated) => {
      // emit custom events if certain property was changed
      const customEvents = {
        'Connected': (value) => this.emit(value ? 'connected' : 'disconnected', this.properties),
        'Paired': (value) => this.emit(value ? 'paired' : 'unpaired', this.properties)
      }

      Object.keys(changed).forEach(property => {
        this.#properties[property.toLowerCase()] = changed[property].value
        
        // Call custom event if applicable
        if (customEvents[property]) customEvents[property](changed[property].value)
      })

      // console.log(`updated value for device ${this.properties.alias}`)
      
      // emit the propertyChanged event
      this.emit('propertyChanged', this.properties)
    })
  }

  destroy () {
    this.#propertiesInterface.removeAllListeners()
  }

  get properties () {
    return this.#properties
  }

  get connected () {
    return this.#properties.Connected
  }

  get Media () {
    return this.$media
  }

  async getMediaInterface () {
    // Get nodes
    // Find node that contains 'playerX'
    // Get proxyObject for playerX
    // Get Track Details somehow?
    // ???
    // Profit

    // Get Nodes
    const nodes = this.#obj.nodes
    
    // Find node that contains 'playerX'
    const players = nodes.filter(node => ndoe.includes('player'))
    if (!players) throw `No players found for device: ${this.properties.address}`

    // Get the bluez Object
    const PlayerObj = await bus.getProxyObject('org.bluez', players[0])
    this.#mediaObj = PlayerOBj
    console.debug(`Media Object set for ${this.properties.address}`)
    
    // Get the MediaControl Interface
    const Player = PlayerObj.getInterface('org.bluez.MediaPlayer1')
    this.#media = Player
    console.debug(`Media Player set for ${this.properties.address}`)

    // Get the Media Properties Interface
    const Properties = PlayerObj.getInterface('org.freedesktop.DBus.Properties')
    this.#mediaProperties = Properties
    console.debug(`Media Properties set for ${this.properties.address}`)

    // Create listener for Property Changes
    this.#mediaProperties.on('PropertiesChanged', (itf, changed, invalidated) => {
      // Custom event handler for each property change
      // Setting the value for the property in here as 'track' is updated to 'null' 1s after track info is given
      const events = {
        'track': (value) => {
          if (!value) return
          this.#mediaProperties[key.toLowerCase()] = changed[key]
          this.emit('media-track', value)
        }
      }

      // Iterate through and call the corresponding event
      Object.keys(changed).forEach(key => {
          // this.#mediaProperties[key.toLowerCase()] = changed[key]

          if (events[key]) events[key.toLowerCase()] (changed[key])
      })
    })

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
    const connectListener = new Promise ((resolve, reject) => {
      this.once('connected', (properties) => resolve(properties))
    })
    this.#deviceInterface.Connect()
  
    const res = await promiseTimeout(
        10000,
        `Could not connect to device ${this.#properties.name ? `(${this.properties.name})` : this.properties.address}`,
        connectListener       
      )
  
    return res
  }


}

module.exports = Device

// Go through all device properties and save to js object here.
// On 'propertiesChanged' update the properties and then emit change
// to the subscribed devices

/*
  async pair () {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        clearTimeout(timeoutId)
        reject(`Timeout Error. Could not pair to device ${this.#properties.name ? `(${this.properties.name})` : this.properties.address}`)
      }, 10000)
      this.once('paired', (properties) => {
        clearTimeout(timeoutId)
        resolve(properties)
      })
    })
  }
*/
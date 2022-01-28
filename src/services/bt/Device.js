const EventEmitter = require('events')
const { promiseTimeout } = require('../../resources')

class Device extends EventEmitter{

  #obj;
  #deviceInterface;
  #propertiesInterface;
  #properties;
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
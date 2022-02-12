'use strict'

const config = require('../../config')

const SocketIO = require('socket.io')

const Bluetooth = require('./bluetooth')

/**
 * WebSocket Library for Jeopardy
 * @memberof Services
 */
class WebSocket {
  constructor () {
    this.socket
    this.clients
    this.subscriptions
  }

  /**
   * Setup the Websocket server
   */
  async startServer (server) {
    // Setup Websockets
    this.socket = SocketIO(server, {
      cors: {
        origin: "*",
        methods: ['GET', 'POST']
      }
    })
    this.clients = []
    this.subscriptions = {}

    Bluetooth.on('deviceFound', device => {
      this.socket.emit('bt-deviceFound', { [device.properties.address]: device.properties })
      device.removeAllListeners('propertyChanged')
      device.on('propertyChanged', (properties) => this.notify(properties.address, 'bt-deviceUpdate', { [properties.address]: properties} ))
      device.on('media-update', (properties) => this.notify(device.properties.address, 'media-update', { properties } ))
    })

    Bluetooth.on('deviceLost', device => {
      device.removeAllListeners()
      this.socket.emit('bt-deviceLost', device.properties.address )

    })
    
    this.socket.on('connection', (client) => this._onConnection(client))
  }

  async notify (group, event, msg) {
    if (!this.subscriptions[group]) return

    const channel = this.subscriptions[group]
    const subscribers = Object.keys(channel)

    subscribers.forEach(client => {
      channel[client].emit(event, msg)
    })

  }

  async subscribe (client, group) {
    group = group?.split(' ').join('-')
    if (!this.subscriptions[group]) this.subscriptions[group] = {}
    this.subscriptions[group][client.id] = client

    client.emit('subscribed', `subscribed to ${group}`)
  }

  async unsubscribe (client, group) {
    delete this.subscriptions[group][client.id]

    client.emit('unsubscribed', `unsubscribed to ${group}`)
  }

  async subscribeToDevices (client) {
    let devices = await Bluetooth.getDiscoveryBuffer()
    devices.forEach(device => {
      this.subscribe(client, device.address)
    })
  }

  async refreshDiscoveredDevices (client, msg) {
    const devices = Bluetooth.getFormattedDevices()
    try {
      client.emit('bt-devices', devices)
    } catch (err) {
      console.log(client)
      err.description = 'Could not call client.emit()'
      console.log(err)
    }
  }

  async connectToDevice(client, msg) {
    const devices = Bluetooth.getDevices()
    try {
      // console.log(devices)
      // console.log(devices[msg.address])
      const res = await devices[msg.address].connect()
      console.log('connected')
      // console.log(res)
      client.emit('connected', res)
    } catch (err) {
      // err.description = 'Could not connect to device'
      console.debug(err)
    }
  }

  async disconnectFromDevice (client, msg) {
    const devices = Bluetooth.getDevices()
    try {
      // Cant listen for device disconnect internally, so we listen for lost devices. If a lost device is 'paired', we cancel the 'lostDevice' emitter and instead call disconnected
      // Now realising this is a bad solution, but we send all the important data back to the front end so this should work.
      Bluetooth.once('deviceDisconnected', (device) => client.emit('bt-disconnected', { [device.properties.address]: device.properties }))
      devices[msg.address].disconnect()

      // client.emit('bt-deviceFound', { [msg.address]: devices[msg.address].properties })
    } catch (err) {
      // err.description = 'Could not disconnect from device'
      // console.log(err.description)
      console.log('could not disconnect form device')
      console.debug(err)
    }
  }

  /**
   * Triggered when a Websocket client connects
   * @param ws The Websocket of the client
   * @private
   */
  async _onConnection (client) {
    console.log('client connected')
    this.refreshDiscoveredDevices(client)
    // client.emit('connected')

    // Setup event listeners
    // client.prependAny(console.log)
    client.on('bt-refresh', (msg) => this.refreshDiscoveredDevices(client, msg))
    client.on('list', (msg) => this.onList(client, msg))
    client.on('subscribe', (msg) => this.subscribe(client, msg))
    client.on('bt-connect', (msg) => this.connectToDevice(client, msg))
    client.on('bt-disconnect', (msg) => this.disconnectFromDevice(client, msg))
    // client.on('check-host', (msg) => this.onCheckHost(client, msg))
  }

}

const webSocket = new WebSocket()

module.exports = webSocket

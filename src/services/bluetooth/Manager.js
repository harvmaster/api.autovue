const EventEmitter = require('events')
const dbus = require('dbus-next')
let bus = dbus.systemBus();

const Device = require('./Device')
const InterfaceObjectManager = require('./InterfaceObjectManager')

const { getInterface } = require('./InterfaceHelper')
const { log } = require('../../resources');

class Bluetooth extends EventEmitter {

  #adapter;       // (/org/bluez/hci0 - org.bluez.Adapter1) Device bluetooth adapter.
  #objectManager; // (/org/bluez/hci0 - org.bluez.ObjectManager1) handles discovery of new interfaces / devices 

  constructor () {
    super()

    this.devices = {}
    this.init()
  }

  async init () {
    const startupPromises = [
      this.initAgent(),
      this.initAdapter(),
      this.initObjectManager(),
    ]

    try {
      await Promise.all(startupPromises)
      this.emit('Initialised', this)

      console.log('initialised')

      this.discoverDevices()
      return this
    } catch (err) {
      log('bluetooth-error', 'Failed to initialise Bluetooth'),
      console.error(err)
    }
  }

  get discoveryState () {
    return this.#adapter.properties.discovering
  }

  // Registers and sets the agent as default
  async initAgent () {
    log('bluetooth', 'Initialising Bluetooth Agent')
    try {
      const bluez = await bus.getProxyObject('org.bluez', '/org/bluez')

      const agentManager = bluez.getInterface('org.bluez.AgentManager1')
      agentManager.RegisterAgent('/test/agent', 'NoInputNoOutput')
      agentManager.RequestDefaultAgent('/test/agent')

      log('bluetooth', 'Initialised Bluetooth Agent')
      return
    } catch (err) {
      err.description = 'Failed to initialise Bluetooth Agent'
      log('bluetooth-error', err.description)
      throw err
    }
  }

  async initAdapter () {
    log('bluetooth', 'Initialising Bluetooth Adapter')

    try {
      const adapterObj = await bus.getProxyObject('org.bluez', '/org/bluez/hci0')
      const adapterInterface = await getInterface(adapterObj, 'org.bluez.Adapter1')

      adapterInterface.obj = adapterObj
      this.#adapter = adapterInterface

      log('bluetooth', 'Initialised Bluetooth Adapter')
      return
    } catch (err) {
      err.description = 'Failed to Initialise Adapter'
      log('bluetooth-error', err.description)
      throw err
    }
  }

  async initObjectManager () {
    const objectManager = new InterfaceObjectManager()
    await objectManager.init()

    this.#objectManager = objectManager
    await this.initObjectManagerEvents()
    return
  }

  initObjectManagerEvents () {
    const events = {
      'device-found': ({ device }) => this.addDevice(device),
      'device-lost': ({ address }) => this.removeDevice(address),
      'mediaTransport-found': ({ address, itf }) => this.devices[address].initMediaTransport(itf),
      'mediaTransport-lost': ({ address }) => this.devices[address].destroyMediaTrasnport(),
      'mediaPlayer-found': ({ address, itf }) => this.devices[address].initMediaPlayer(itf),
      'mediaPlayer-lost': ({ address }) => this.devices[address].destroyMediaPlayer()
    }

    Object.keys(events).forEach(event => this.#objectManager.on(event, (params) => events[event] (params)))
  }

  async addDevice (device) {
    log('bluetooth-device', `Bluetooth Device Found: ${device.properties.address}`)
    this.devices[device.properties.address] = device

    this.emit('device-found', device)
  }

  async removeDevice (address) {
    log('bluetooth-device', `Bluetooth Device Lost: ${address}`)
    delete this.devies[address]

    this.emit('device-lost', address)
  }

  getFormattedDevices () {
    const devices = this.devices
    const res = {}
    Object.keys(devices).forEach(address => res[address] = devices[address].properties)
    return res
  }

  getDevices () {
    return this.devices
  }

  async setDiscovery (state) {
    log('bluetooth',  `${state ? 'Starting' : 'Stopping'} device discovery`)
    try {
      const startDiscovery = this.#adapter.interface.StartDiscovery
      const stopDiscovery = this.#adapter.interface.stopDiscovery
      state ? startDiscovery() : stopDiscovery()
    } catch (err) {
      err.desciption = `Failed to ${state ? 'start' : 'stop'} bluetooth discovery`
      log('bluetooth-error', err.description)
      throw err
    }
  }

  async discoverDevices () {
    if (!this.discoveryState) {
      log('bluetooth-warn', 'Can not discover devices while adapter discovery is disabled')
      // throw new Error('Can not discover devices while adapter discovery is disabled')
    }

    log('bluetooth', 'Discovering available devices')
    Object.keys(this.devices).forEach(address => {
      this.devices[address].destroy
      delete this.devices[address]
    })

    this.#adapter.obj.nodes.map(async path => {
      try {
        const deviceObj = await bus.getProxyObject('org.bluez', path)
        const device = new Device(deviceObj)
        await device.init()

        this.addDevice(device)
      } catch (err) {
        err.descrption = `Failed to get device: ${path}`
        log('bluetooth-error', err.description)
        log('bluetooth-error-verbose', err)
      }
    })

    
  }

  getConnectedDevice () {
    return this.devices[Object.keys(this.devices).find(address => this.devices[address].properties.connected)]
  }

  // Kind of an anti pattern here.
  // Connecting to the device here instead of in the device because i need to disconnect from any existing device first
  async connectTo (addresses) {
    addresses = [].concat(addresses || [])
    for (let address of addresses) {
      if (!this.devices[address]) log('bluetooth-error', `No device found with address: ${address}`)
      if (this.devices[address].isConnected) {
        this.emit('device-connected', this.devices[address])
        return this.devices[address]
      }
      const connected = await this.devices[address].connect()
      if (connected) return connected
    }
  }


}

module.exports = new Bluetooth()
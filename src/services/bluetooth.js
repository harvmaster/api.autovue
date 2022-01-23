const EventEmitter = require('events')
const dbus = require('dbus-next')
let bus = dbus.systemBus();
let Variant = dbus.Variant;

const Device = require('./bt/Device')

let Connections = require('../models/connection')

let { debug } = require('../resources')

/*
  Properties
    this.adapter: { Interface, Properties }

*/
class Bluetooth extends EventEmitter{
  constructor () {
    super()
    this.init()
    this.discoveryBuffer = {}
    this.devices = {}
  }

  // Initialise all required adapters and interfaces
  async init () {
    const promises = [
      this.initAgent(),
      this.initAdapter(),
      this.initObjectManager()
    ]

    try {
      await Promise.all(promises)
      this.startDiscovery()
      console.log('Initialised Bluetooth Handler')
      console.log('Fetching Bluetooth Devices')
      this.hardReloadDevices()
    } catch (err) {
      console.log('Failed to initialise Bluetooth Handler')
      console.error(err)
    }
  }

  // Sets bluetooth agent to not require pin when pairing
  async initAgent () {
    console.log('Initialising Bluetooth Agent')
    try {
      const bluez = await bus.getProxyObject('org.bluez', '/org/bluez')
      // debug(bluez)

      const agentManager = bluez.getInterface('org.bluez.AgentManager1')
      agentManager.RegisterAgent('/test/agent', 'NoInputNoOutput')
    } catch (err) {
      err.description = 'Failed to initialise Bluetooth Agent'
      throw err
    }
  }

  // Create local variable for adapter properties
  async initAdapter () {
    console.log('Initialising Bluetooth Adapter')

    try {
      const adapterObject = await bus.getProxyObject('org.bluez', '/org/bluez/hci0')
      const adapterInterface = adapterObject.getInterface('org.bluez.Adapter1')
      const adapterProps = adapterObject.getInterface('org.freedesktop.DBus.Properties')

      this.adapter = {
        obj: adapterObject,
        interface: adapterInterface,
        properties: adapterProps
      }
      console.log('Adapter Initialised')

    } catch (err) {
      err.description = 'Failed to initalise Adapter'
      debug(err.description)
      throw err
    }
  }

  async initObjectManager () {
    try {
      console.log('Initialising Object Manager')
      const rootObject = await bus.getProxyObject('org.bluez', '/')
      const manager = rootObject.getInterface('org.freedesktop.DBus.ObjectManager')

      this.objectManager = manager
      console.log('Initialised Object Manager')
    } catch (err) {
      err.description = 'Failed to get Object Manager'
      debug(err.description)
      throw err
    }
  }

  // Discoverable defines whether other devices can find this device in their bluetooth settings
  async setDiscoverable (state) {
    try {
      await this.adapter.properties.Set('org.bluez.Adapter1', 'Discoverable', new Variant ('b', state ))
    } catch (err) {
      err.description = `Failed to set discoverable to ${state}`
      debug(err.description)
      throw err
    }
    return this
  }

  async isDiscoverable () {
    try {
      let state = await this.adapter.properties.Get('org.bluez.Adapter1', 'Discoverable')
      return state
    } catch (err) {
      err.description = `Failed to get discoverable state`
      debug(err.description)
      throw err
    }
  }

  // Discovery will add entries to hci0/nodes, therfore adding devices that can be interacted with
  // Need to figure out a listener for this
  async startDiscovery () {
    // Add the currently discovered devices to the buffer and start listening for new ones
    try {
      const currentDevices = await this.getDevices()
      this.discoveryBuffer = currentDevices

      // house keeping
      this.objectManager.removeAllListeners('InterfaceAdded')
      this.objectManager.removeAllListeners('InterfaceRemoved')

      // Handle when a device is found
      this.objectManager.on('InterfacesAdded', async (itf, added) => {
        const address = itf.split('dev')[1].substring(1, 18).split('_').join(':')
        const deviceProxy = await bus.getProxyObject('org.bluez', `/org/bluez/hci0/dev_${added['org.bluez.Device1'].Address.value.split(':').join('_')}`)
        const device = new Device(deviceProxy)
        
        await device.init()
        this.devices[address] = device
        this.emit('deviceFound', device)
      })

      // Handle when a device disappears
      this.objectManager.on('InterfacesRemoved', (itf, removed) => {
        const address = itf.split('dev')[1].substring(1, 18).split('_').join(':')
        const device = this.devices[address]
        
        this.emit('deviceLost', device)
        this.device[address].destroy()
        delete this.devices[address]
      })
    } catch (err) {
      err.description = 'Failed to add current devices to buffer or could not add/remove interface from buffer'
      debug(err.description)
      throw err
    }

    try {
      debug('Starting Device Discovery')
      this.adapter.interface.StartDiscovery()
    } catch (err) {
      err.description = 'Failed to start bluetooth discovery'
      debug(err.description)
      throw err
    }
  }

  async stopDiscovery () {
    try {
      debug('Stopping Device Discovery')
      this.adapter.interface.StopDiscovery()
    } catch (err) {
      err.description = 'Failed to stop bluetooth discovery'
      debug(err.description)
      throw err
    }
  }

  // Returns the devices found in hci0 nodes -- eg. hci0/dev_xx_xx_xx_xx_xx
  // Does not scan first
  // returns [{ name: '', address: '' }]
  async hardReloadDevices () {
    // Cleanly remove old devices
    Object.keys(this.devices).forEach(address => {
      this.deviecs[address].destroy
    })
    this.devices = {}

    // Get new devices
    const devices = this.adapter.obj.nodes.map(async node => {
      try {
        const nodeObj = await bus.getProxyObject('org.bluez', node)
        const device = new Device(nodeObj)
        await device.init()

        this.emit('deviceFound', device)
        
        return device.properties
      } catch (err) {
        debug(`Failed to get device: ${node}`)
        debug(err) 
      }
    })
    const result = await Promise.all(devices).then(resolved => {
      const res = {}
      resolved.forEach(r => res[r.address] = r)
      return res
    })
    this.devices = result
  }

  getDevices () {
    return this.devices
  }

  // Address should probably be path
  async pair (address) {
    const deviceObj = await bus.getProxyObject('org.bluez', address)
    const deviceInterface = deviceObj.getInterface('org.bluez.Device1')
    const deviceProps = deviceObj.getInterface('org.freedesktop.DBus.Properties')

    await deviceProps.Set('org.bluez.Device1', 'Trusted', new Variant('b', true))
    deviceProps.on('PropertiesChanged', (itf, changed, invalid) => {
      if (changed.Connected) {
        device.Connect()
      }
    })

    await device.Pair()
    
  }


}

module.exports = new Bluetooth()
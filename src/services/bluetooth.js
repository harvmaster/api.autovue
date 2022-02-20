const EventEmitter = require('events')
const dbus = require('dbus-next')
let bus = dbus.systemBus();
let Variant = dbus.Variant;

const Device = require('./bt/Device')

let Connections = require('../models/connection')

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
      this.initInterfaceHandler()
      // this.setDiscoverable(true)
      // this.startDiscovery()
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

      const agentManager = bluez.getInterface('org.bluez.AgentManager1')
      // Registers and sets the agent as default. Not sure why it needs to be set as default as it should be per application basis and default should apply to all applications?
      agentManager.RegisterAgent('/test/agent', 'NoInputNoOutput')
      agentManager.RequestDefaultAgent('/test/agent')

      console.log('Initialised Bluetooth Agent')
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
      console.debug(err.description)
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
      console.debug(err.description)
      throw err
    }
  }

  async initInterfaceHandler () {
    try {
      const currentDevices = await this.getDevices()
      this.discoveryBuffer = currentDevices

      // house keeping
      this.objectManager.removeAllListeners('InterfaceAdded')
      this.objectManager.removeAllListeners('InterfaceRemoved')

      // Handle when a device is found
      this.objectManager.on('InterfacesAdded', async (itf, added) => {
        const address = itf.split('dev')[1].substring(1, 18).split('_').join(':')

        // Check if its a player interface
        const itfSplit = itf.split('/')
        const isPlayer = itfSplit.at(-1).includes('player')
        // console.log(added)
        // console.log(itf)
        try {
          if (isPlayer) {
            this.devices[address].initMedia(added)
            return
          } 
          if (!added['org.bluez.Device1']) return
          const deviceProxy = await bus.getProxyObject('org.bluez', `/org/bluez/hci0/dev_${added['org.bluez.Device1'].Address.value.split(':').join('_')}`)
          const device = new Device(deviceProxy)
        
          await device.init()
          this.devices[address] = device
          this.emit('deviceFound', device)
        } catch (err) {
          err.description = 'error when adding interface'
          console.log(err)
        }
      })

      // Handle when a device disappears
      this.objectManager.on('InterfacesRemoved', (itf, removed) => {
        // console.log(itf, removed)
        const address = itf.split('dev')[1].substring(1, 18).split('_').join(':')
        const device = this.devices[address]

        if (device.properties.paired) {
          this.emit('deviceDisconnected', device)
          this.rediscoverDevice(address)
          return
        }
        
        this.emit('deviceLost', device)
        device.destroy()
        delete this.devices[address]
      })
    } catch (err) {
      err.description = 'Failed to add current devices to buffer or could not add/remove interface from buffer'
      console.debug(err.description)
      throw err
    }
  }

  // Discoverable defines whether other devices can find this device in their bluetooth settings
  async setDiscoverable (state) {
    try {
      await this.adapter.properties.Set('org.bluez.Adapter1', 'Discoverable', new Variant ('b', state ))
    } catch (err) {
      err.description = `Failed to set discoverable to ${state}`
      console.debug(err.description)
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
      console.debug(err.description)
      throw err
    }
  }

  // Discovery will add entries to hci0/nodes, therfore adding devices that can be interacted with
  // Need to figure out a listener for this
  async startDiscovery () {
    // Add the currently discovered devices to the buffer and start listening for new ones
    

    try {
      console.debug('Starting Device Discovery')
      this.adapter.interface.StartDiscovery()
    } catch (err) {
      err.description = 'Failed to start bluetooth discovery'
      console.debug(err.description)
      throw err
    }
  }

  async stopDiscovery () {
    try {
      console.debug('Stopping Device Discovery')
      this.adapter.interface.StopDiscovery()
    } catch (err) {
      err.description = 'Failed to stop bluetooth discovery'
      console.debug(err.description)
      throw err
    }
  }

  async rediscoverDevice (address) {
    //Remove any old data
    this.devices[address].destroy()
    delete this.devices[address]

    // create device
    const deviceObj = await bus.getProxyObject('org.bluez', `/org/bluez/hci0/dev_${address.split(':').join('_')}`)
    const device = new Device(deviceObj)
    await device.init()

    // Emit as deviceFound because it shouldnt break anything
    this.emit('deviceFound', device)
    // console.log(device.properties)

    // add to devices
    this.devices[address] = device
  }

  // Returns the devices found in hci0 nodes -- eg. hci0/dev_xx_xx_xx_xx_xx
  // Does not scan first
  // returns [{ name: '', address: '' }]
  async hardReloadDevices () {
    // Cleanly remove old devices
    Object.keys(this.devices).forEach(address => {
      this.devices[address].destroy
    })
    this.devices = {}

    // Get new devices
    const devices = this.adapter.obj.nodes.map(async node => {
      try {
        const nodeObj = await bus.getProxyObject('org.bluez', node)
        const device = new Device(nodeObj)
        await device.init()

        this.emit('deviceFound', device)
        
        return device
      } catch (err) {
        console.debug(`Failed to get device: ${node}`)
        console.debug(err) 
      }
    })
    const result = await Promise.all(devices).then(resolved => {
      const res = {}
      // resolved.forEach(device => console.log(device.properties.alias))
      resolved.forEach(r => res[r.properties.address] = r)
      // console.log(res)
      return res
    })
    this.devices = result
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

  getConnectedDevice () {
    return this.devices[Object.keys(this.devices).find(address => this.devices[address].properties.connected)]
  }


}

module.exports = new Bluetooth()
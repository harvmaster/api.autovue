const EventEmitter = require('events')
const dbus = require('dbus-next')
let bus = dbus.systemBus();

const { getInterface } = require('./InterfaceHelper');

const { log } = require('../../resources')

class InterfaceObjectManager extends EventEmitter {

  #objectManager;

  constructor () {
    super()

    // this.init()
  }

  async init () {
    try {
      log('bluetooth', 'Initialising Object Manager')
      const rootObject = await bus.getProxyObject('org.bluez', '/')
      const manager = rootObject.getInterface('org.freedesktop.DBus.ObjectManager')

      this.#objectManager = manager
      log('bluetooth', 'Initialised Object Manager')

      this.initEventHandlers()
      return
    } catch (err) {
      err.description = 'Failed to get Object Manager'
      log('bluetooth-error', err.description)
      throw err
    }
  }

  initEventHandlers () {
    // Remove any residual listeners
    this.#objectManager.removeAllListeners('InterfaceAdded')
    this.#objectManager.removeAllListeners('InterfaceRemoved')

    // Event handler for when a device is found or added
    this.#objectManager.on('InterfacesAdded', (itf, added) => {
      const address = itf.split('dev')[1].substring(1, 18).split('_').join(':')
      const interfaceType = this.getInterfaceType(added)

      const typeHandlers = {
        'device': async () => {
          const deviceProxy = await bus.getProxyObject('org.bluez', itf)
          const device = new Device(deviceProxy)
        
          await device.init()
          this.emit('device-found', { device })
        },
        'mediaTransport': () => {
          this.emit('mediaTransport-found', { address, itf })
        },
        'mediaPlayer': () => {
          this.emit('mediaPlayer-found', { address, itf })
        },
        'default': () => {

        }
      }

      typeHandlers[interfaceType] ()

    })
  }

  /*
   *  
   */
  getInterfaceType (itf) {
    const types = {
      'org.bluez.Device1': 'device',
      'org.bluez.MediaTransport1': 'mediaTransport',
      'org.bluez.MediaPlayer1': 'mediaPlayer'
    }
    const typeKey = Object.keys(types).find(key => itf[key] != null)
    return types[typeKey] || 'default'
  }



  
}

module.exports = InterfaceObjectManager
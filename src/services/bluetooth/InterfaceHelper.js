const EventEmitter = require('events')

const getInterface = async (obj, target, options = {}) => {
  // make sure the interface exists
  // console.log(obj)
  if (!obj.interfaces.hasOwnProperty(target)) throw new Error(`${target} could not be found in ${obj.path}`)

  const itf = new EventEmitter()
  itf._properties = {}

  options.mutators = options.mutators || {}
  options.callbacks = options.callbacks || {}

  
  // Get the properties and add them to the event emitter object
  const propertiesInterface = obj.getInterface('org.freedesktop.DBus.Properties')
  
  const getProperties = async () => {
    const properties = await propertiesInterface.GetAll(target)
    Object.keys(properties).forEach(property => {
      const key = property.toLowerCase()
      let value = properties[property].value

      value = options.mutators.hasOwnProperty(key) ? options.mutators[key](value, key) : value
      itf._properties[key] = value
    })
  }
  itf.getProperties = getProperties
  await getProperties()

  itf.getRawProperties = async () => {
    const properties = await propertiesInterface.GetAll(target)
    return properties
  }

  // allow the caller to make changes to the properties
  // Allows for interface.properties.volume = 5
  // and will properly update the interface
  // 
  // Basically complicated 'setter' for it
  Object.defineProperty(itf, 'properties', {
    get: function () {
      return { ...this._properties }
    }
  })
  Object.keys(itf.properties).forEach(property => {
    Object.defineProperty(itf.properties, property, {
      get: function () { return itf._properties[property] },
      set: async function (value) {
        console.log('setting')
        const res = await propertiesInterface.Set(target, property, value)
        console.log(res)
        return res
      }
    })
  })

  itf.setProperty = async (property, value) => {
    const res = await propertiesInterface.Set(target, property, value)
    return res
  }

  const defaultHandler = (value, key) => {
    itf._properties[key] = value
    return
  }

  // Listener for property changes
  propertiesInterface.on('PropertiesChanged', (itfs, changed, invalidated) => {
    Object.keys(changed).forEach(property => {
      const key = property.toLowerCase()
      let value = changed[property].value

      // console.log(key, value)

      value = options.mutators.hasOwnProperty(key) ? options.mutators[key](value, key) : value
      defaultHandler(value, key)
      options.callbacks.hasOwnProperty(key) && options.callbacks[key] (itf.properties)
    })
    itf.emit('propertyChanged', itf.properties)
  })

  // Get interface and add methods to eventEmitter
  const deviceInterface = obj.getInterface(target)
  deviceInterface['$methods'].forEach(method => itf[method.name] = deviceInterface[method.name])

  itf.getPropertyCharacteristics = () => {
    return deviceInterface['$properties']
  }
  return itf
}

module.exports = { getInterface }
const EventEmitter = require('events')

const getInterface = async (obj, target, options) => {
  const itf = new EventEmitter()
  itf._properties = {}
  
  // Get the properties and add them to the event emitter object
  const propertiesInterface = obj.getInterface('org.freedesktop.DBus.Properties')
  
  const properties = await propertiesInterface.GetAll(target)
  Object.keys(properties).forEach(property => {
    itf._properties[property.toLowerCase()] = properties[property].value
  })

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
        const res = await propertiesInterface.set(target, property, value)
        return res
      }
    })
  })

  const defaultPropertyChangeHandler = (value, key) => {
    itf.properties[key] = value
  }

  // Listener for property changes
  propertiesInterface.on('PropertiesChanged', (itf, changed, invalidated) => {
    Object.keys(changed).forEach(property => {
      (options.propertyChanged[property.toLowerCase()] || defaultPropertyChangeHandler) (changed[property].value, property.toLowerCase(), defaultPropertyChangeHandler)
    })
    itf.emit('propertyChanged', itf.properties)
  })

  // Get interface and add methods to eventEmitter
  const deviceInterface = obj.getInterface(target)
  deviceInterface['$methods'].forEach(method => itf[method.name] = deviceInterface[method.name])

  return itf
}

module.exports = { getInterface }
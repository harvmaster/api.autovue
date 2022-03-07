const dbus = require('dbus-next')
const Variant = dbus.Variant

const types = {
  volume: 'q',
  discoverable: 'b'
}

const toVariant = (method, value) => {
  return new Variant(types[method.toLowerCase()], value)
}

module.exports = { toVariant } 
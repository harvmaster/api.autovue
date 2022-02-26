const Bluetooth = require('./bluetooth/Manager')
const Connections = require('../models/connection')

const initBluetooth = () => {
  Bluetooth.once('initialised', bt => {
    initDeviceConnections()
  })

  return Bluetooth
}

const initDeviceConnections = async (bt) => {
  const chain = await Connections.getPositionChain()

  console.log(chain)
  Bluetooth.connectTo(chain).catch(err => {})
}

module.exports = initBluetooth()
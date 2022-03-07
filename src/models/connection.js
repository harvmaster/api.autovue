const config = require('../../config')
const { arrayToObj } = require('../resources')

const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  name: String,
  address: String,
  spotifyId: String,
  priority: {
    prev: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'conneections'
    },
    next: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'conneections'
    } 
  }
}, {
  timestamps: true
})

schema.methods.format = async function () {
  return {
    id: this._id,
    name: this.name,
    address: this.address
  }
}

schema.methods.getPriority = async function () {
  // Get devices / connections
  let connections = await Connection.find()
  connections = arrayToObj(connections)

  // Loop through counting iterations until the start
  let check = this
  for (let i = 0; i < connections.length; i++) {
    if (check.priority.prev == null) return { value: i, ...this.priority }
      
    check = connections[check.priority.prev]
  }

  return { value: 0, ...this.priority }
}

schema.methods.setPosition = async function (position) {
  let connections = await Connection.find()  
  const first = connections.find(connection => connection.priority.prev == null) || connections[0]
  connections = arrayToObj(connections)

  const priority = { ...this.priority }

  // set the element to 'position'
  let prevCheck = first
  // Find it
  for (let i = 0; i < position; i++) {
    prevCheck = connections[prevCheck.priority.next]
  }
  // set the values
  let prev = connections[prevCheck.priority.prev].priority.next
  prev.priority.next = this.id

  prevCheck.priority.prev = this.id
  this.priority = {
    prev: prev.id,
    next: prevCheck.id
  }

  // fix the gap created from its previous 'position'
  connections[priority.prev].priority.next = priority.next
  connections[priority.next].priority.prev = priority.prev
  
  // Save everything
  const res = await Promise.all(
    prev.save(),
    this.save(),
    connections[priority.prev].save(),
    connections[priority.next].save()
  )
}

schema.methods.getPosition = () => {

}

schema.statics.getPositionChain = async () => {
  let devices = await Connection.find()
  // console.log(devices)
  const first = devices.find(device => device.priority.prev == null)
  devices = arrayToObj(devices)

  const chain = []
  let check = first
  while (check.priority.next != null) {
    chain.push(check.address)
    check = devices[check.priority.next]
  }
  chain.push(check.address)

  return chain
}

const Connection = module.exports = mongoose.model('Connection', schema)
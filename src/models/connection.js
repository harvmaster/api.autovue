const config = require('../../config')

const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  name: String,
  address: String,
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

module.exports = mongoose.model('Connection', schema)

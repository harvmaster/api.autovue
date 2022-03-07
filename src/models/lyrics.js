const config = require('../../config')
const { arrayToObj } = require('../resources')

const mongoose = require('mongoose')

/*  
    Lyrics: [
      {
        index: index in this array?
        starts: timestamp,
        words: 'string with a paragraph of words',
      }
    ]
*/
const schema = new mongoose.Schema({
  name: String,
  artist: String,
  lyrics: {
    type: Array,
    of: Object
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

schema.methods.setPosition = async function (position) {

}

schema.methods.getPosition = () => {

}

const Lyrics = module.exports = mongoose.model('Lyrics', schema)
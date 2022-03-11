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

schema.statics.getBloomFilter = async function (title, artist, duration) {
  
}

schema.methods.getPosition = () => {

}


const Lyrics = module.exports = mongoose.model('Lyrics', schema)
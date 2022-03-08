const config = require('../../config')
const { arrayToObj } = require('../resources')
const axios = require('axios')

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

schema.statics.downloadLyrics = async function (title, artist, duration) {
  console.log(`downloading lyrics for ${title} by ${artist}`)

  const res = await axios.get(`https://api.lyrics.ovh/v1/${artist}/${title}`)

  if (!res.data.lyrics) throw new Error(`No lryics found for ${title} by ${artist}`)

  const dbLyrics = new Lyrics({ name: title, artist })
  const splitLyrics = res.data.lyrics.split(/\n/)

  const formattedLyrics = splitLyrics.map((line, index, arr) => {
    const lyric = {
      timestamp: duration / arr.length * index,
      line: line
    }
    return lyric
  })

  console.log(formattedLyrics.filter(line => line.line != ''))

  dbLyrics.lyrics = formattedLyrics

  await dbLyrics.save()
}

schema.methods.getPosition = () => {

}

const Lyrics = module.exports = mongoose.model('Lyrics', schema)
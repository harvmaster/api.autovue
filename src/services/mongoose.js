'use strict'

const config = require('../../config')
const mongoose = require('mongoose')

mongoose.connection.on('connected', () => {
  console.log('MongoDB is connected')
})

mongoose.connection.on('error', (err) => {
  console.log(`Could not connect to MongoDB because of ${err}`)
  process.exit(1)
})

mongoose.set('debug', false)

exports.connect = async () => {
  const mongodb = `mongodb://${config.mongo.username}:${config.mongo.password}@${config.mongo.uri}`
  mongoose.connect(mongodb, {
    keepAlive: 1,
    useNewUrlParser: true,
    useUnifiedTopology: true
  })

  // mongoose.set('useCreateIndex', true)

  return mongoose.connection
}

const config = require('../../config')

const debug = (value) => {
  if (config.debug) {
    console.log(value)
  }
}

const promiseTimeout = (ms, rejectionMessage, promise) => {

  // Create a promise that rejects in <ms> milliseconds
  let timeout = new Promise((resolve, reject) => {
    let id = setTimeout(() => {
      clearTimeout(id);
      reject(`Timeout Error: ${rejectionMessage}`)
    }, ms)
  })

  // Returns a race between our timeout and the passed in promise
  return Promise.race([
    promise,
    timeout
  ])
}

module.exports = { debug, promiseTimeout }
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

const cleanDBusProperties = (obj) => {
  const result = {}
  Object.keys(obj).forEach(key => {
    result[key.toLowerCase()] = obj[key].value
  })
  return result
}

const cleanDBusPrint = (obj) => {
  console.log({
    name: obj.name || obj['$name'],
    nodes: obj.nodes,
    interfaces: Object.keys(obj?.interfaces || {}),
    properties: obj['$properties'],
    methods: obj['$methods']
  })
}

const arrayToObj = (arr) => {
  return arr.reduce(function(acc, cur, i) {
    acc[cur.id] = cur;
    return acc;
  }, {});
}

module.exports = { debug, promiseTimeout, cleanDBusProperties, cleanDBusPrint, arrayToObj }
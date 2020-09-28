const path = require('path')

const { DBFactory } = require('./factory')

exports.indexedDB = new DBFactory(path.resolve(__dirname, './test/tmp/indexeddb'))

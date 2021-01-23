const { DBObjectStore } = require('./store')
const Queue = require('avenue')

class DBDatabase {
    constructor (factory) {
        this._factory = factory
        this._queue = new Queue
    }

    createObjectStore (name, { autoIncrement = false, keyPath = null } = {}) {
        if (name === undefined) {
            throw new TypeError
        }
        const objectStore = new DBObjectStore(this, this._queue)
        this._factory._enqueue(name, async () => {
            console.log('called')
        })
        return objectStore
    }
}

exports.DBDatabase = DBDatabase

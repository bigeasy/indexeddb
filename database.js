const { DBObjectStore } = require('./store')
const Queue = require('avenue')

class DBDatabase {
    constructor (factory) {
        this._factory = factory
        this._queue = new Queue
    }

    get name () {
        throw new Error
    }

    get version () {
        throw new Error
    }

    get objectStoreNames () {
        throw new Error
    }

    transaction (names, mode = 'readonly') {
        if (typeof names == 'string') {
            names = [ names ]
        }
        throw new Error
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

    deleteObjectStore (name) {
        throw new Error
    }

    // **TODO** `onabort`, `onclose`, `onerror`, `onversionchange`.
}

exports.DBDatabase = DBDatabase

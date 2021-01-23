const { DBObjectStore } = require('./store')
const { DBRequest } = require('./request')

const Queue = require('avenue')

class DBDatabase {
    constructor (factory, queues) {
        this._factory = factory
        this._queues = queues
        this._progress = [ false ]
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
        const request = new DBRequest
        this._queues.transaction.push({ method: 'transaction', names, mode, request })
        throw new Error
    }

    createObjectStore (name, { autoIncrement = false, keyPath = null } = {}) {
        // **TODO** Assert we do not have a transaction error.
        if (name === undefined) {
            throw new TypeError
        }
        this._queues.schema.push({ method: 'store', name, autoIncrement, keyPath })
        return new DBObjectStore(name, this, this._queues.schema, this._progress)
    }

    deleteObjectStore (name) {
        throw new Error
    }

    // **TODO** `onabort`, `onclose`, `onerror`, `onversionchange`.
}

exports.DBDatabase = DBDatabase

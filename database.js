const { DBObjectStore } = require('./store')
const { DBRequest } = require('./request')
const { DBTransaction } = require('./transaction')

const Queue = require('avenue')

const Loop = require('./loop')

class DBDatabase {
    constructor (database, queues) {
        this._database = database
        this._queues = queues
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
        const loop = new Loop
        this._database.transactor.transaction(loop, names, mode == 'readonly')
        return new DBTransaction(this._database, loop)
    }

    createObjectStore (name, { autoIncrement = false, keyPath = null } = {}) {
        // **TODO** Assert we do not have a transaction error.
        if (name === undefined) {
            throw new TypeError
        }
        this._queues.schema.push({ method: 'store', name, autoIncrement, keyPath })
        return new DBObjectStore(name, this, this._queues.schema)
    }

    deleteObjectStore (name) {
        throw new Error
    }

    // **TODO** `onabort`, `onclose`, `onerror`, `onversionchange`.
}

exports.DBDatabase = DBDatabase

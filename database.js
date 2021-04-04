const { DBObjectStore } = require('./store')
const { DBRequest } = require('./request')
const { DBTransaction } = require('./transaction')

const Queue = require('avenue')

const Loop = require('./loop')

class DBDatabase {
    constructor (database, queues, redux, name) {
        this._database = database
        this._queues = queues
        this._queue = redux
        this._name = name
    }

    get name () {
        return this._name
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
        this._queue.push({ method: 'store', name, autoIncrement, keyPath })
        return new DBObjectStore(name, this, this._queues.schema)
    }

    deleteObjectStore (name) {
        throw new Error
    }

    // https://www.w3.org/TR/IndexedDB/#dom-idbdatabase-close
    close () {
        this._queues.transactions.queue.push(null)
    }

    // **TODO** `onabort`, `onclose`, `onerror`, `onversionchange`.
}

exports.DBDatabase = DBDatabase

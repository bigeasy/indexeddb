const { DBObjectStore } = require('./store')
const { Queue } = require('avenue')

class DBTransaction {
    constructor (schema, database, loop, mode) {
        if (mode == null) {
            throw new Error
        }
        this._schema = schema
        // List of stores created during this transaction if it is a version
        // update transaction.
        this._created = []
        this._database = database
        this._loop = loop
        this._mode = mode
    }

    get objectStoreNames () {
    }

    get mode () {
        return this._mode
    }


    get db () {
        return this._database
    }

    get error () {
    }

    objectStore (name) {
        return new DBObjectStore(this, name, this._database, this._loop, this._schema, this._schema.name[name])
    }

    abort () {
        this._aborted = true
        // Mark any stores created by this transaction as deleted, then queue
        // them for actual destruction.
        for (const id of this._created) {
            this._schema.store[id].deleted = true
            this._loop.queue.push({ method: 'destroy', id: id })
        }
    }
}

exports.DBTransaction = DBTransaction

const { DBObjectStore } = require('./store')
const { Queue } = require('avenue')

class DBTransaction {
    constructor (schema, database, loop, mode) {
        if (mode == null) {
            throw new Error
        }
        this._schema = schema
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
        const id = this._schema.name[name]
        return new DBObjectStore(this, name, this._database, this._loop, this._schema.store[id], this._schema.extractor[id])
    }

    abort () {
    }
}

exports.DBTransaction = DBTransaction

const { DBObjectStore } = require('./store')
const { Queue } = require('avenue')

class DBTransaction {
    constructor (schema, database, loop, mode) {
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
        return new DBObjectStore(name, this._database, this._loop, this._schema[name])
    }

    abort () {
    }
}

exports.DBTransaction = DBTransaction

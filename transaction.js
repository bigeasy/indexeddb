const { DBObjectStore } = require('./store')
const { Queue } = require('avenue')

class DBTransaction {
    constructor (database, loop, mode) {
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
        return new DBObjectStore(name, this._database, this._loop)
    }

    abort () {
    }
}

exports.DBTransaction = DBTransaction

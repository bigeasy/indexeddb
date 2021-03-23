const { DBObjectStore } = require('./store')

class DBTransaction {
    constructor (database, loop) {
        this._database = database
        this._loop = loop
    }

    get objectStoreNames () {
    }

    get mode () {
    }


    get db () {
    }

    get error () {
    }

    objectStore (name) {
        try {
        return new DBObjectStore(name, this._database, this._loop)
        } catch (error) {
            console.log(error.stack)
        }
    }

    abort () {
    }

    // **TODO** `onabort`, `oncomplete`, `onerror`.
}

exports.DBTransaction = DBTransaction

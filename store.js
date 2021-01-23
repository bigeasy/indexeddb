const { DBRequest } = require('./request')

class DBObjectStore {
    constructor (name, database, queue, progress) {
        this.name = name
        this._database = database
        this._queue = queue
        this._progress = progress
    }

    put (value, key = null) {
        const request = new DBRequest
        this._progress[0] = true
        this._queue.push({ method: 'put', name: this.name, request, value })
        return request
    }

    add (value, key = null) {
        throw new Error
    }

    delete (query) {
        throw new Error
    }

    clear () {
        throw new Error
    }

    getKey (query) {
        throw new Error
    }

    getAll (query, count = null) {
        throw new Error
    }

    getAllKeys (query, count = null) {
        throw new Error
    }

    count (query) {
        throw new Error
    }

    openCursor (query, direction = 'next') {
        throw new Error
    }

    openKeyCursor (query, direction = 'next') {
        throw new Error
    }

    index (name) {
        throw new Error
    }

    createIndex (name, keyPath, { unique = false, multiEntry = false }) {
        throw new Error
    }

    deleteIndex (name) {
        throw new Error
    }
}

exports.DBObjectStore = DBObjectStore

class DBObjectStore {
    constructor (database) {
        this._database = database
    }

    put (value, key = null) {
        throw new Error
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

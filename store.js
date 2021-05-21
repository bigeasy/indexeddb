const { DBRequest } = require('./request')
const { DBKeyRange } = require('./keyrange')
const { DBCursor, DBCursorWithValue } = require('./cursor')
const { dispatchEvent } = require('./dispatch')
const { InvalidStateError, DataError, ReadOnlyError } = require('./error')
const { valuify } = require('./value')

const assert = require('assert')

// Not sure if IndexedDB API expects the same object store returned from every
// transaction, no idea how that would work, so this isn't an object that
// implements a store, it is an object that is an interface to a store for a
// specific transaction.


class DBObjectStore {
    // The loop is the event loop for the transaction associated with this
    // object store, we push messages with a request object. The work is
    // performed by the loop object. The loop object is run after the locking is
    // performed.
    constructor (transaction, name, database, loop, schema, extractor) {
        assert(schema, 'schema is null')
        this._transaction = transaction
        this._name = name
        this._database = database
        this._loop = loop
        this._schema = schema
        this._extractor = extractor
    }

    get name () {
        return this._name
    }

    put (value, key = null) {
        if (key == null) {
            key = valuify((this._extractor)(value))
        }
        const request = new DBRequest
        this._loop.queue.push({ method: 'put', request, name: this._name, key, value })
        return request
    }

    add (value, key = null) {
        console.log('called called called', this._transaction.mode)
        if (this._schema.deleted) {
            throw new InvalidStateError
        }
        if (this._transaction.mode == "readonly") {
            throw new ReadOnlyError
        }
        if (key != null && this._schema.keyPath != null) {
            throw new DataError
        }
        if (key == null && this._schema.autoIncrement == null && this._schema.keyPath == null) {
            throw new DataError
        }
        if (key != null) {
            key = valuify(key)
        } else if (this._schema.autoIncrement == null) {
            key = valuify((this._extractor)(value))
        }
        const request = new DBRequest
        this._loop.queue.push({ method: 'add', request, name: this._name, value, key })
        return request
    }

    delete (query) {
        throw new Error
    }

    clear () {
        throw new Error
    }

    get (key) {
        const request = new DBRequest
        this._loop.queue.push({ method: 'get', request, name: this._name, key })
        return request
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
        if (query == null) {
            query = new DBKeyRange(null, null)
        }
        const request = new DBRequest
        const cursor = new DBCursorWithValue(request, this._loop, query)
        request.result = cursor
        this._loop.queue.push({ method: 'openCursor', request, name: this._name, cursor: cursor })
        return request
    }

    openKeyCursor (query, direction = 'next') {
        throw new Error
    }

    index (name) {
        throw new Error
    }

    createIndex (name, keyPath, { unique = false, multiEntry = false }) {
        this._loop.queue.push({ method: 'index', name: { store: this.name, index: name }, keyPath, unique, multiEntry })
    }

    deleteIndex (name) {
        throw new Error
    }
}

exports.DBObjectStore = DBObjectStore

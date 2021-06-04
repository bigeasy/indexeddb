const { TransactionInactiveError, NotFoundError, InvalidStateError, DataError, ReadOnlyError } = require('./error')
const { extractify } = require('./extractor')
const { vivify } = require('./setter')
const { valuify } = require('./value')

const Verbatim = require('verbatim')

const assert = require('assert')

const IDBRequest = require('./living/generated/IDBRequest')

const webidl = require('./living/generated/utils')

// Not sure if IndexedDB API expects the same object store returned from every
// transaction, no idea how that would work, so this isn't an object that
// implements a store, it is an object that is an interface to a store for a
// specific transaction.


class IDBObjectStoreImpl {
    // The loop is the event loop for the transaction associated with this
    // object store, we push messages with a request object. The work is
    // performed by the loop object. The loop object is run after the locking is
    // performed.
    constructor (globalObject, [], { transaction, schema, name }) {
        assert(schema, 'schema is null')
        this._globalObject = globalObject
        assert(typeof transaction == 'object')
        this._transaction = transaction
        this._schema = schema
        this._store = this._schema.getObjectStore(name)
    }

    get transaction () {
        return webidl.wrapperForImpl(this._transaction)
    }

    get name () {
        return this._store.name
    }

    get indexNames () {
        const list =  new DOMStringList()
        list.push.apply(list, this._schema.getIndexNames(this._store.name))
        return list
    }

    _addOrPut (value, key, overwrite) {
        if (this._schema.isDeleted(this._store)) {
            throw new InvalidStateError
        }
        if (this._transaction._state != 'active') {
            throw new TransactionInactiveError
        }
        if (this._transaction.mode == 'readonly') {
            throw new ReadOnlyError
        }
        if (key != null && this._store.keyPath != null) {
            throw new DataError
        }
        if (key == null && this._store.autoIncrement == null && this._store.keyPath == null) {
            throw new DataError
        }
        value = Verbatim.deserialize(Verbatim.serialize(value))
        if (this._store.keyPath != null) {
            key = this._schema.getExtractor(this._store.id)(value)
        }
        if (this._store.autoIncrement != null) {
            if (key == null) {
                key = this._store.autoIncrement++
                if (this._store.keyPath != null) {
                    vivify(value, this._store.keyPath, key)
                }
            } else {
                key = valuify(key)
                if (key >= this._store.autoIncrement) {
                    this._store.autoIncrement = key + 1
                }
            }
        } else {
            key = valuify(key)
        }
        const request = IDBRequest.createImpl(this._globalObject)
        this._transaction._queue.push({ method: 'set', request, store: this._store, key, value, overwrite })
        return webidl.wrapperForImpl(request)
    }

    put (value, key = null) {
        return this._addOrPut(value, key, true)
    }

    add (value, key = null) {
        return this._addOrPut(value, key, false)
    }

    delete (query) {
        throw new Error
    }

    clear () {
        const request = new DBRequest
        this._transaction._queue.push({ method: 'clear', request, store: this._store })
        return request
    }

    get (key) {
        const request = IDBRequest.createImpl(this._globalObject)
        this._transaction._queue.push({ method: 'get', type: 'store', request, store: this._store, key })
        return webidl.wrapperForImpl(request)
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
        if (this._schema.isDeleted(this._store)) {
            throw new InvalidStateError
        }
        if (query == null) {
            query = new DBKeyRange(null, null)
        }
        const request = new DBRequest
        this._transaction._queue.push({ method: 'count', request, store: this._store, query })
        return request
    }

    openCursor (query, direction = 'next') {
        if (query == null) {
            query = new DBKeyRange(null, null)
        }
        const request = new DBRequest
        const cursor = new DBCursorWithValue(this._transaction, request, query)
        request.result = cursor
        this._transaction._queue.push({ method: 'openCursor', request, store: this._store, cursor: cursor, direction })
        return request
    }

    openKeyCursor (query, direction = 'next') {
        throw new Error
    }

    index (name) {
        if (this._schema.isDeleted(this._store)) {
            throw new InvalidStateError
        }
        if (this._transaction._state == 'finished') {
            throw new InvalidStateError
        }
        const index = this._schema.getIndex(this._store.name, name)
        if (index == null) {
            throw new NotFoundError
        }
        return new DBIndex(this._transaction, this._schema, this._store, index)
    }

    createIndex (name, keyPath, { unique = false, multiEntry = false } = {}) {
        if (this._transaction.mode != 'versionchange') {
            throw new InvalidStateError
        }
        if (this._schema.isDeleted(this._store)) {
            throw new InvalidStateError
        }
        if (this._transaction._state != 'active') {
            throw new InvalidStateError
        }
        if (this._schema.getIndex(this._name, name) != null) {
            throw new ConstraintError
        }
        // **TODO** If keyPath is not a valid key path, throw a "SyntaxError" DOMException.
        if (Array.isArray(keyPath) && multiEntry) {
            throw new InvalidAccessError
        }
        const index = this._schema.createIndex(this._store.name, name, keyPath, multiEntry, unique)
        this._transaction._queue.push({ method: 'create', type: 'index', store: this._store, index })
        return new DBIndex(this._transaction, this._schema, this._store, index)
    }

    deleteIndex (name) {
        if (this._transaction.mode != 'versionchange') {
            throw new InvalidStateError
        }
        if (this._schema.isDeleted(this._store)) {
            throw new InvalidStateError
        }
        if (this._transaction._state != 'active') {
            throw new InvalidStateError
        }
        const index = this._schema.getIndex(this._store.name, name)
        if (index == null) {
            throw new NotFoundError
        }
        this._schema.deleteIndex(this._store.name, index.name)
        this._transaction._queue.push({ method: 'destroy', store: this._store, index: index })
    }
}

module.exports = { implementation: IDBObjectStoreImpl }

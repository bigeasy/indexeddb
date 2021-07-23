const extractor = require('./extractor')
const { vivify } = require('./setter')
const { valuify } = require('./value')

const Verbatim = require('verbatim')

const assert = require('assert')

const convert = require('./convert')

const IDBRequest = require('./living/generated/IDBRequest')
const IDBIndex = require('./living/generated/IDBIndex')
const IDBKeyRange = require('./living/generated/IDBKeyRange')
const IDBCursor = require('./living/generated/IDBCursor')
const IDBCursorWithValue = require('./living/generated/IDBCursorWithValue')
const DOMStringList = require('./living/generated/DOMStringList')

const DOMException = require('domexception/lib/DOMException')

const webidl = require('./living/generated/utils')

const structuredClone = require('./structuredClone')

// Not sure if IndexedDB API expects the same object store returned from every
// transaction, no idea how that would work, so this isn't an object that
// implements a store, it is an object that is an interface to a store for a
// specific transaction.


class IDBObjectStoreImpl {
    // The loop is the event loop for the transaction associated with this
    // object store, we push messages with a request object. The work is
    // performed by the loop object. The loop object is run after the locking is
    // performed.
    constructor (globalObject, [], { transaction, schema, name, constructing = false }) {
        assert(schema, 'schema is null')
        this._globalObject = globalObject
        assert(typeof transaction == 'object')
        this._transaction = transaction
        this._schema = schema
        this._store = this._schema.getObjectStore(name)
        this.keyPath = JSON.parse(JSON.stringify(this._store.keyPath))
        this.autoIncrement = this._store.autoIncrement != null
        this._constructing = constructing
    }

    // Common `isDeleted` interface for inspection from an outstanding cursor.
    _isDeleted () {
        return this._schema.isDeleted(this._store)
    }

    get transaction () {
        return webidl.wrapperForImpl(this._transaction)
    }

    set name (to) {
        if (this._isDeleted()) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction.mode != 'versionchange') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (this._store.name != to) {
            if (this._schema.getObjectStore(to) != null) {
                throw DOMException.create(this._globalObject, [ 'TODO: message', 'ConstraintError' ], {})
            }
            const from = this._store.name
            this._schema.rename(from, to)
            this._transaction._queue.push({
                method: 'rename',
                type: 'store',
                store: JSON.parse(JSON.stringify(this._store))
            })
        }
    }

    get name () {
        return this._store.name
    }

    get indexNames () {
        return DOMStringList.create(this._globalObject, [], { array: this._schema.getIndexNames(this._store.name) })
    }

    _addOrPut (value, key, overwrite) {
        if (this._isDeleted()) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (this._transaction.mode == 'readonly') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'ReadOnlyError' ], {})
        }
        if (key != null && this._store.keyPath != null) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'DataError' ], {})
        }
        if (key == null && this._store.autoIncrement == null && this._store.keyPath == null) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'DataError' ], {})
        }
        try {
            this._transaction._state = 'inactive'
            value = structuredClone(this._globalObject, value)
        } finally {
            this._transaction._state = 'active'
        }
        if (this._store.keyPath != null) {
            key = this._schema.getExtractor(this._store.id)(value)
        }
        if (this._store.autoIncrement != null) {
            if (key == null) {
                key = this._store.autoIncrement++
                if (this._store.keyPath != null) {
                    vivify(this._globalObject, value, this._store.keyPath, key)
                }
            } else {
                key = valuify(this._globalObject, key)
                if (typeof key == 'number' && key >= this._store.autoIncrement) {
                    this._store.autoIncrement = Math.floor(key + 1)
                }
            }
        } else {
            key = valuify(this._globalObject, key)
        }
        const request = IDBRequest.createImpl(this._globalObject, [], { transaction: this._transaction, source: this })
        this._transaction._queue.push({
            method: 'set',
            request,
            store: JSON.parse(JSON.stringify(this._store)),
            key,
            value,
            overwrite
        })
        return webidl.wrapperForImpl(request)
    }

    put (value, key = null) {
        return this._addOrPut(value, key, true)
    }

    add (value, key = null) {
        return this._addOrPut(value, key, false)
    }

    delete (query) {
        if (this._isDeleted()) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (this._transaction.mode == 'readonly') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'ReadOnlyError' ], {})
        }
        if (query != null && ! (query instanceof this._globalObject.IDBKeyRange)) {
            query = this._globalObject.IDBKeyRange.only(convert.key(this._globalObject, query))
        }
        const request = IDBRequest.createImpl(this._globalObject, [], {
            // **TODO** parent is always transaction, so...
            transaction: this._transaction, source: this
        })
        this._transaction._queue.push({
            method: 'delete',
            store: JSON.parse(JSON.stringify(this._store)),
            request,
            query
        })
        return request
    }

    clear () {
        if (this._isDeleted()) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (this._transaction.mode == 'readonly') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'ReadOnlyError' ], {})
        }
        const request = IDBRequest.createImpl(this._globalObject, [], { transaction: this._transaction, source: this })
        this._transaction._queue.push({
            method: 'clear',
            request: request,
            store: JSON.parse(JSON.stringify(this._store))
        })
        return request
    }

    _get (query, keys) {
        if (this._isDeleted()) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (query == null) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'DataError' ], {})
        }
        if (! (query instanceof this._globalObject.IDBKeyRange)) {
            query = this._globalObject.IDBKeyRange.only(convert.key(this._globalObject, query))
        }
        const request = IDBRequest.createImpl(this._globalObject, {}, { transaction: this._transaction, source: this })
        this._transaction._queue.push({
            method: 'get',
            type: 'store',
            request: request,
            store: JSON.parse(JSON.stringify(this._store)),
            query: query,
            keys: keys
        })
        return request
    }

    get (query) {
        return this._get(query, false)
    }

    getKey (query) {
        return this._get(query, true)
    }

    _getAll(query, count, keys) {
        if (this._isDeleted()) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (query == null) {
            query = IDBKeyRange.createImpl(this._globalObject, [ null, null ], {})
        } else if (! (query instanceof this._globalObject.IDBKeyRange)) {
            query = this._globalObject.IDBKeyRange.only(convert.key(this._globalObject, query))
        }
        const request = IDBRequest.createImpl(this._globalObject, {}, { transaction: this._transaction, source: this })
        this._transaction._queue.push({
            method: 'getAll',
            type: 'store',
            request: request,
            store: JSON.parse(JSON.stringify(this._store)),
            query: query,
            count: count,
            keys: keys
        })
        return request
    }

    getAll (query, count = 0) {
        return this._getAll(query, count, false)
    }

    getAllKeys (query, count = null) {
        return this._getAll(query, count, true)
    }

    count (query) {
        if (this._isDeleted()) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (query == null) {
            query = IDBKeyRange.createImpl(this._globalObject, [ null, null ], {})
        } else if (! (query instanceof this._globalObject.IDBKeyRange)) {
            query = this._globalObject.IDBKeyRange.only(convert.key(this._globalObject, query))
        }
        const request = IDBRequest.createImpl(this._globalObject, [], { transaction: this._transaction, source: this })
        this._transaction._queue.push({
            method: 'count',
            type: 'store',
            request: request,
            store: JSON.parse(JSON.stringify(this._store)),
            query: query
        })
        return request
    }

    _openCursor (Cursor, query, direction) {
        if (this._isDeleted()) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (query == null) {
            query = IDBKeyRange.createImpl(this._globalObject, [ null, null ], {})
        } else if (! (query instanceof this._globalObject.IDBKeyRange)) {
            query = this._globalObject.IDBKeyRange.only(convert.key(this._globalObject, query))
        }
        const request = IDBRequest.createImpl(this._globalObject, [], { transaction: this._transaction, source: this })
        const cursor = Cursor.createImpl(this._globalObject, [], {
            type: 'store',
            transaction: this._transaction,
            store: this._store,
            request: request,
            query: query,
            direction: direction,
            source: this
        })
        request._result = webidl.wrapperForImpl(cursor)
        this._transaction._queue.push({
            method: 'openCursor',
            type: 'store',
            request: request,
            store: JSON.parse(JSON.stringify(this._store)),
            cursor: cursor,
            direction: direction,
            query: query
        })
        return request
    }

    openCursor (query, direction = 'next') {
        return this._openCursor(IDBCursorWithValue, query, direction)
    }

    openKeyCursor (query, direction = 'next') {
        return this._openCursor(IDBCursor, query, direction)
    }

    index (name) {
        if (this._isDeleted()) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction._state == 'finished') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        const index = this._schema.getIndex(this._store.name, name)
        if (index == null) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'NotFoundError' ], {})
        }
        return IDBIndex.create(this._globalObject, [], {
            transaction: this._transaction,
            schema: this._schema,
            store: JSON.parse(JSON.stringify(this._store)),
            index: index,
            objectStore: this
        })
    }

    createIndex (name, keyPath, { unique = false, multiEntry = false } = {}) {
        if (this._isDeleted()) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction.mode != 'versionchange') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (this._store.index[name] != null) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'ConstraintError' ], {})
        }
        extractor.verify(this._globalObject, keyPath)
        // **TODO** If keyPath is not a valid key path, throw a "SyntaxError" DOMException.
        if (Array.isArray(keyPath) && multiEntry) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidAccessError' ], {})
        }
        const index = this._schema.createIndex(this._store.name, name, keyPath, multiEntry, unique)
        this._transaction._queue.push({
            method: 'create',
            type: 'index',
            store: JSON.parse(JSON.stringify(this._store)),
            index: index
        })
        return IDBIndex.create(this._globalObject, [], { objectStore: this, index: index })
    }

    deleteIndex (name) {
        if (this._isDeleted()) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction.mode != 'versionchange') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        const index = this._schema.getIndex(this._store.name, name)
        if (index == null) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'NotFoundError' ], {})
        }
        this._schema.deleteIndex(this._store.name, index.name)
        this._transaction._queue.push({
            method: 'destroy',
            store: JSON.parse(JSON.stringify(this._store)),
            index: index
        })
    }
}

module.exports = { implementation: IDBObjectStoreImpl }

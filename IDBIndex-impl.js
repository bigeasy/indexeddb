const IDBRequest = require('./living/generated/IDBRequest')
const IDBKeyRange = require('./living/generated/IDBKeyRange')
const DOMException = require('domexception/lib/DOMException')
const IDBCursor = require('./living/generated/IDBCursor')
const IDBCursorWithValue = require('./living/generated/IDBCursorWithValue')

const webidl = require('./living/generated/utils')
const convert = require('./convert')

class IDBIndexImpl {
    // TODO Make loop a property of transaction.
    constructor (globalObject, [], { index, objectStore }) {
        this._globalObject = globalObject
        this._index = index
        // Different instances of index need different instances of keyPath, but
        // keyPath must be the same each time the accessor is called.
        this.keyPath = JSON.parse(JSON.stringify(this._index.keyPath))
        this.objectStore = objectStore
    }

    get name () {
        return this._index.name
    }

    set name (to) {
        if (this.objectStore._schema.isDeleted(this._index)) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this.objectStore._transaction.mode != 'versionchange') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this.objectStore._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (this._index.name != to) {
            if (to in this.objectStore._store.index) {
                throw DOMException.create(this._globalObject, [ 'TODO: message', 'ConstraintError' ], {})
            }
            this.objectStore._schema.renameIndex(this.objectStore._store.id, this._index.name, to)
            this.objectStore._transaction._queue.push({
                method: 'rename',
                type: 'index',
                store: JSON.parse(JSON.stringify(this.objectStore._store)),
                index: JSON.parse(JSON.stringify(this._index))
            })
        }
    }

    get multiEntry () {
        return this._index.multiEntry
    }

    get unique () {
        return this._index.unique
    }

    _get (query, key) {
        const request = IDBRequest.createImpl(this._globalObject, [], {})
        if (this.objectStore._schema.isDeleted(this._index)) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this.objectStore._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (query == null) {
            query = IDBKeyRange.createImpl(this._globalObject, [ null, null ], {})
        } else if (! (query instanceof this._globalObject.IDBKeyRange)) {
            query = this._globalObject.IDBKeyRange.only(convert.key(this._globalObject, query))
        }
        this.objectStore._transaction._queue.push({
            method: 'get',
            type: 'index',
            key: key,
            store: this.objectStore._store,
            index: this._index,
            query: query,
            request: request
        })
        return request
    }

    get (query) {
        return this._get(query, false)
    }

    getKey (query) {
        return this._get(query, true)
    }

    _getAll (query, count, keys) {
        if (this.objectStore._schema.isDeleted(this._index)) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this.objectStore._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (query == null) {
            query = IDBKeyRange.createImpl(this._globalObject, [ null, null ], {})
        } else if (! (query instanceof this._globalObject.IDBKeyRange)) {
            query = this._globalObject.IDBKeyRange.only(convert.key(this._globalObject, query))
        }
        const request = IDBRequest.createImpl(this._globalObject, {}, { parent: this._transaction, source: this })
        this.objectStore._transaction._queue.push({
            method: 'getAll',
            type: 'index',
            request: request,
            store: JSON.parse(JSON.stringify(this.objectStore._store)),
            index: this._index,
            query: query,
            count: count,
            keys: keys
        })
        return request
    }

    getAll (query, count = null) {
        return this._getAll(query, count, false)
    }

    getAllKeys (query, count = null) {
        return this._getAll(query, count, true)
    }

    count (query) {
        if (this.objectStore._schema.isDeleted(this._index)) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this.objectStore._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (query == null) {
            query = IDBKeyRange.createImpl(this._globalObject, [ null, null ], {})
        } else if (! (query instanceof this._globalObject.IDBKeyRange)) {
            query = this._globalObject.IDBKeyRange.only(convert.key(this._globalObject, query))
        }
        const request = IDBRequest.createImpl(this._globalObject, [], { parent: this._transaction, source: this })
        this.objectStore._transaction._queue.push({
            method: 'count',
            type: 'index',
            request: request,
            store: JSON.parse(JSON.stringify(this.objectStore._store)),
            index: this._index,
            query: query
        })
        return request
    }

    _openCursor (Cursor, query, direction = 'next') {
        if (this.objectStore._schema.isDeleted(this._index)) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this.objectStore._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (query == null) {
            query = IDBKeyRange.createImpl(this._globalObject, [ null, null ], {})
        } else if (! (query instanceof this._globalObject.IDBKeyRange)) {
            query = this._globalObject.IDBKeyRange.only(convert.key(this._globalObject, query))
        }
        const request = IDBRequest.createImpl(this._globalObject, [], { parent: this._transaction })
        const cursor = Cursor.createImpl(this._globalObject, [], {
            type: 'index',
            hello: 'world',
            transaction: this.objectStore._transaction,
            request: request,
            store: this.objectStore._store,
            index: this._index,
            query: query,
            source: this
        })
        request._result = webidl.wrapperForImpl(cursor)
        this.objectStore._transaction._queue.push({
            method: 'openCursor',
            type: 'index',
            store: JSON.parse(JSON.stringify(this.objectStore._store)),
            index: this._index,
            request: request,
            cursor: cursor,
            direction: direction,
            source: this
        })
        return request
    }

    openCursor (query, direction = 'next') {
        return this._openCursor(IDBCursorWithValue, query, direction)
    }

    openKeyCursor (query, direction = 'next') {
        return this._openCursor(IDBCursor, query, direction)
    }
}

module.exports = { implementation: IDBIndexImpl }

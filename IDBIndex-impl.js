const IDBRequest = require('./living/generated/IDBRequest')
const DOMException = require('domexception/lib/DOMException')
const IDBCursorWithValue = require('./living/generated/IDBCursorWithValue')
const IDBKeyRange = require('./living/generated/IDBKeyRange')

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

    get multiEntry () {
        return this._index.multiEntry
    }

    get unique () {
        return this._index.unique
    }

    get (query) {
        const request = IDBRequest.createImpl(this._globalObject, [], {})
        if (this.objectStore._schema.isDeleted(this._index)) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this.objectStore._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (!(query instanceof this._globalObject.IDBKeyRange)) {
            query = webidl.implForWrapper(this._globalObject.IDBKeyRange.only(query))
        }
        this.objectStore._transaction._queue.push({
            method: 'get',
            type: 'index',
            key: false,
            store: this.objectStore._store,
            index: this._index,
            query: query,
            request: request
        })
        return request
    }

    getKey (query) {
        const request = IDBRequest.createImpl(this._globalObject, [], {})
        if (this.objectStore._schema.isDeleted(this._index)) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this.objectStore._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (!(query instanceof this._globalObject.IDBKeyRange)) {
            query = webidl.implForWrapper(this._globalObject.IDBKeyRange.only(query))
        }
        this.objectStore._transaction._queue.push({
            method: 'get',
            type: 'index',
            key: true,
            store: this.objectStore._store,
            index: this._index,
            query,
            request
        })
        return request
    }

    getAll (query, count = null) {
        if (this.objectStore._schema.isDeleted(this._index)) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this.objectStore._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        throw new Error
    }

    getAllKeys (query, count = null) {
        if (this.objectStore._schema.isDeleted(this._index)) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this.objectStore._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        throw new Error
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

    openCursor (query, direction = 'next') {
        if (this.objectStore._schema.isDeleted(this._index)) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this.objectStore._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (query != null && ! (query instanceof this.objectStore._globalObject.IDBKeyRange))  {
            query = this._globalObject.IDBKeyRange.only(query)
        }
        const request = IDBRequest.createImpl(this._globalObject, [], { parent: this._transaction })
        const cursor = IDBCursorWithValue.createImpl(this._globalObject, [], {
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

    openKeyCursor (query, direction = 'next') {
        if (this.objectStore._schema.isDeleted(this._index)) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this.objectStore._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        throw new Error
    }
}

module.exports = { implementation: IDBIndexImpl }

const IDBRequest = require('./living/generated/IDBRequest')
const DOMException = require('domexception/lib/DOMException')

const webidl = require('./living/generated/utils')

class IDBIndexImpl {
    // TODO Make loop a property of transaction.
    constructor (globalObject, [], { transaction, schema, store, index, objectStore }) {
        this._globalObject = globalObject
        this._transaction = transaction
        this._schema = schema
        this._store = store
        this._index = index
        this.objectStore = objectStore
    }

    get name () {
        return this._index.name[0]
    }

    get keyPath () {
        return this._index.keyPath
    }

    get multiEntry () {
        return this._index.multiEntry
    }

    get unique () {
        return this._index.unique
    }

    get (query) {
        const request = IDBRequest.createImpl(this._globalObject, [], {})
        if (this._schema.isDeleted(this._index)) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (!(query instanceof this._globalObject.IDBKeyRange)) {
            query = webidl.implForWrapper(this._globalObject.IDBKeyRange.only(query))
        }
        this._transaction._queue.push({
            method: 'get',
            type: 'index',
            key: false,
            store: this._store,
            index: this._index,
            query: query,
            request: request
        })
        return request
    }

    getKey (query) {
        const request = IDBRequest.createImpl(this._globalObject, [], {})
        if (this._schema.isDeleted(this._index)) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (!(query instanceof this._globalObject.IDBKeyRange)) {
            query = webidl.implForWrapper(this._globalObject.IDBKeyRange.only(query))
        }
        this._transaction._queue.push({ method: 'get', type: 'index', key: true, store: this._store, index: this._index, query, request })
        return request
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
}

module.exports = { implementation: IDBIndexImpl }

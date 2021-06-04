const IDBRequest = require('./living/generated/IDBRequest')

class IDBIndexImpl {
    // TODO Make loop a property of transaction.
    constructor (globalObject, [], { transaction, schema, store, index }) {
        this._globalObject = globalObject
        this._transaction = transaction
        this._schema = schema
        this._store = store
        this._index = index
    }

    get name () {
        return this._index.name
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
            throw new InvalidStateError
        }
        if (this._transaction._state != 'active') {
            throw new TransactionInactiveError
        }
        if (!(query instanceof this._globalObject.IDBKeyRange)) {
            query = this._globalObject.IDBKeyRange.only(query)
        }
        this._transaction._queue.push({ method: 'get', type: 'index', key: false, store: this._store, index: this._index, query, request })
        return request
    }

    getKey (query) {
        const request = new DBRequest
        if (this._schema.isDeleted(this._index)) {
            throw new InvalidStateError
        }
        if (this._transaction._state != 'active') {
            throw new TransactionInactiveError
        }
        if (!(query instanceof DBKeyRange)) {
            query = DBKeyRange.only(query)
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

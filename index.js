const { DBRequest } = require('./request')
const { DBKeyRange } = require('./keyrange')
const { TransactionInactiveError, InvalidStateError } = require('./error')

class DBIndex {
    // TODO Make loop a property of transaction.
    constructor (transaction, schema, store, index) {
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

exports.DBIndex = DBIndex

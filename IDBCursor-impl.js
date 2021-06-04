class IDBCursorImpl {
    constructor (transaction, request, query) {
        this._request = request
        this._transaction = transaction
        this._query = query
    }

    get source () {
        throw new Error
    }

    get direction () {
        throw new Error
    }

    get key () {
        return this._value.key
    }

    get primaryKey () {
        throw new Error
    }

    advance (count) {
        if (count == 0) {
            throw new TypeError('count must not be zero')
        }
        // TODO If the transaction is not active, throw a
        // 'TransactionInactiveError' `DOMExecption`.
        throw new Error
    }

    continue (key) {
        this._transaction._queue.push({ method: 'item', cursor: this, request: this._request })
    }

    continuePrimaryKey (key, primaryKey) {
        throw new Error
    }

    update (value) {
        throw new Error
    }

    delete () {
        throw new Error
    }
}

module.exports = { implementation:  IDBCursorImpl }

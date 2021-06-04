const IDBCursorImpl = require('./IDBCursor-impl').implementation

class IDBCursorWithValueImpl extends IDBCursorImpl {
    constructor (transaction, request, query) {
        super(transaction, request, query)
        this._value = null
    }

    get value () {
        return this._value.value
    }
}

module.exports = { implementation: IDBCursorWithValueImpl }

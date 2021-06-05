const IDBCursorImpl = require('./IDBCursor-impl').implementation

class IDBCursorWithValueImpl extends IDBCursorImpl {
    constructor (globalObject, [], { transaction, request, query }) {
        super(globalObject, [], { transaction, request, query })
        this._value = null
    }

    get value () {
        return this._value.value
    }
}

module.exports = { implementation: IDBCursorWithValueImpl }

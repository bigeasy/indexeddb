const IDBCursorImpl = require('./IDBCursor-impl').implementation

class IDBCursorWithValueImpl extends IDBCursorImpl {
    constructor (globalObject, [], properties) {
        super(globalObject, [], properties)
        this._value = null
    }

    get value () {
        return this._value.value
    }
}

module.exports = { implementation: IDBCursorWithValueImpl }

const assert = require('assert')

const EventTargetImpl = require('./living/idl/EventTarget-impl.js').implementation
const DOMException = require('domexception/lib/DOMException')

const { setupForSimpleEventAccessors } = require('./living/helpers/create-event-accessor')

// The [IDBRequest](https://www.w3.org/TR/IndexedDB-3/#request-api) interface.

//
class IDBRequestImpl extends EventTargetImpl {
    constructor (globalObject, args, { parent, transaction = null }) {
        super(globalObject, args, {})

        this._globalObject = globalObject
        this._parent = parent || null
        this._error = null
        this.source = null
        this.transaction = transaction
        this.readyState = 'pending'
    }

    // Error getter performs a [state
    // check](https://www.w3.org/TR/IndexedDB-3/#dom-idbrequest-error).
    get error () {
        if (this.readyState != 'done') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        return this._error
    }

    get result () {
        if (this.readyState != 'done') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        return this._result
    }

    // Events will propagate from the request to the transaction that originated
    // the request to the database object.
    //
    // https://github.com/w3c/IndexedDB/issues/66#issuecomment-185297860
    _getTheParent () {
        return this._parent
    }
}

setupForSimpleEventAccessors(IDBRequestImpl.prototype, [ 'success', 'error' ]);

module.exports = { implementation: IDBRequestImpl }

const assert = require('assert')

const EventTargetImpl = require('./living/idl/EventTarget-impl.js').implementation

const { setupForSimpleEventAccessors } = require('./living/helpers/create-event-accessor')

class IDBRequestImpl extends EventTargetImpl {
    constructor (globalObject, args, { parent }) {
        super(globalObject, args, {})

        this._parent = parent || null
        this.error = null
        this.source = null
        this.transaction = null
        this.readyState = 'pending'
    }

    _getTheParent () {
        return this._parent
    }
}

setupForSimpleEventAccessors(IDBRequestImpl.prototype, [ 'success', 'error' ]);

module.exports = {
    implementation: IDBRequestImpl
}

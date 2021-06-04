const EventTargetImpl = require('./living/idl/EventTarget-impl.js').implementation

const { setupForSimpleEventAccessors } = require('./living/helpers/create-event-accessor')

class IDBRequestImpl extends EventTargetImpl {
    constructor (globalObject, args, privateData) {
        super(globalObject, args, privateData)

        this.result = null
        this.error = null
        this.source = null
        this.transaction = null
        this.readyState = 'pending'
    }
}

setupForSimpleEventAccessors(IDBRequestImpl.prototype, [ 'success', 'error' ]);

module.exports = {
    implementation: IDBRequestImpl
}

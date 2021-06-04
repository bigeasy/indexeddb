const IDBRequestImpl = require('./IDBRequest-impl').implementation

const { createEventAccessor } = require('./living/helpers/create-event-accessor')

class IDBOpenDBRequestImpl extends IDBRequestImpl {
    constructor (globalObject, args, privateData) {
        super(globalObject, args, privateData)
    }
/*
    toString () {
        return '[object IDBOpenDBRequest]'
    }
*/
}

createEventAccessor(IDBOpenDBRequestImpl.prototype, 'upgradeneeded')
createEventAccessor(IDBOpenDBRequestImpl.prototype, 'blocked')

module.exports = {
    implementation: IDBOpenDBRequestImpl
}

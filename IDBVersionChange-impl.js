const EventImpl = require('./living/idl/Event-impl.js').implementation
const IDBVersionChangeEventInit = require("../generated/IDBVersionChangeEventInit");

class IDBVersionChangeEventImpl extends EventImpl {
    constructor (globalObject, args, privateData) {
        super(globalObject, args, privateData)
        const [type, eventInitDict = this.constructor.defaultInit] = args;
    }
}
IDBVersionChangeEventImpl.defaultInit = IDBVersionChangeEventInit.convert(undefined);

module.exports = {
    implementation: IDBVersionChangeEventImpl
}

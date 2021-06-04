const EventImpl = require('./living/idl/Event-impl.js').implementation
const IDBVersionChangeEventInit = require('./living/generated/IDBVersionChangeEventInit')

class IDBVersionChangeEventImpl extends EventImpl {
    constructor (globalObject, args, privateData) {
        super(globalObject, args, privateData)
        const [type, eventInitDict = this.constructor.defaultInit] = args
        this.newVersion = eventInitDict.newVersion
        this.oldVersion = eventInitDict.oldVersion
    }
}
IDBVersionChangeEventImpl.defaultInit = IDBVersionChangeEventInit.convert(undefined)

module.exports = {
    implementation: IDBVersionChangeEventImpl
}

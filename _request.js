const { EventTarget } = require('./interfaces')

const { createEventAccessor, setupForSimpleEventAccessors } = require('./living/helpers/create-event-accessor')

class DBRequest extends EventTarget {
    constructor () {
        super()
        this.source = null
        this.transaction = null
        this.readyState = 'pending'
    }
}

setupForSimpleEventAccessors(DBRequest.prototype, [ 'success', 'error' ])

class DBOpenDBRequest extends DBRequest {
    constructor () {
        super()
    }

    toString () {
        return '[object IDBOpenDBRequest]'
    }
}

createEventAccessor(DBOpenDBRequest.prototype, 'upgradeneeded')
createEventAccessor(DBOpenDBRequest.prototype, 'blocked')

exports.DBRequest = DBRequest
exports.DBOpenDBRequest = DBOpenDBRequest

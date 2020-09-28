const { EventTarget, defineEventAttribute } = require('event-target-shim')

class DBRequest extends EventTarget {
    constructor () {
        super()
        this.source = null
        this.transaction = null
        this.readyState = 'pending'
        this.onsuccess = null
        this.onerror = null
    }
}

defineEventAttribute(DBRequest.prototype, 'error')
defineEventAttribute(DBRequest.prototype, 'success')

class DBOpenDBRequest extends DBRequest {
    constructor () {
        super()
    }
}

defineEventAttribute(DBOpenDBRequest.prototype, 'blocked')
defineEventAttribute(DBOpenDBRequest.prototype, 'upgradeneeded')

exports.DBRequest = DBRequest
exports.DBOpenDBRequest = DBOpenDBRequest

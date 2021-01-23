const { EventTarget, getEventAttributeValue, setEventAttributeValue } = require('event-target-shim')

class DBRequest extends EventTarget {
    constructor () {
        super()
        this.source = null
        this.transaction = null
        this.readyState = 'pending'
        this.onsuccess = null
        this.onerror = null
    }

    get onsuccess () {
        return getEventAttributeValue(this, 'success')
    }

    set onsuccess (value) {
        setEventAttributeValue(this, 'success', value)
    }

    get onerror () {
        return getEventAttributeValue(this, 'error')
    }

    set onerror (value) {
        setEventAttributeValue(this, 'error', value)
    }
}

class DBOpenDBRequest extends DBRequest {
    constructor () {
        super()
    }

    get onblocked () {
        return getEventAttributeValue(this, 'blocked')
    }

    set onblocked (value) {
        setEventAttributeValue(this, 'blocked', value)
    }

    get onupgradeneeded () {
        return getEventAttributeValue(this, 'upgradeneeded')
    }

    set onupgradeneeded (value) {
        setEventAttributeValue(this, 'upgradeneeded', value)
    }
}

exports.DBRequest = DBRequest
exports.DBOpenDBRequest = DBOpenDBRequest

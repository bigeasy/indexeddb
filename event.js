const { Event } = require('event-target-shim')

class DBVersionChangeEvent extends Event {
    constructor (type, { newVersion = null, oldVersion }) {
        super(type)
        this.newVersion = newVersion
        this.oldVersion = oldVersion
    }

    toString () {
        return 'object [IDBVersionChangeEvent]'
    }
}

exports.DBVersionChangeEvent = DBVersionChangeEvent
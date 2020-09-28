const { DBOpenDBRequest } = require('./request')

function createEvent(type, bubbles, cancelable, detail) {
    return {
        type,
        timeStamp: Date.now(),
        bubbles: bubbles,
        cancelable: cancelable,
        detail: detail || null,
    }
}

class DBFactory {
    constructor (path) {
        console.log(path)
    }

    open (name, version = 0) {
        const request = new DBOpenDBRequest()
        setImmediate(() => {
            request.dispatchEvent(createEvent('upgradeneeded', false, false))
            request.dispatchEvent(createEvent('success', false, false))
        })
        return request
    }
}

exports.DBFactory = DBFactory

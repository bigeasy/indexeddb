const path = require('path')

const { DBFactory } = require('./factory')

class DBIndex {
    get name () {
        throw new Error
    }

    get keyPath () {
        throw new Error
    }

    get multiEntry () {
        throw new Error
    }

    get unique () {
        throw new Error
    }

    get (query) {
        throw new Error
    }

    getKey (query) {
        throw new Error
    }

    getAll (query, count = null) {
        throw new Error
    }

    getAllKeys (query, count = null) {
        throw new Error
    }

    count (query) {
        throw new Error
    }

    openCursor (query, direction = 'next') {
        throw new Error
    }

    openKeyCursor (query, direction = 'next') {
        throw new Error
    }
}

module.exports = DBIndex

const DOMException = require('domexception')

class DataError extends DOMException {
    constructor (message = 'Invalid data provided.') {
        super(message, 'DataError')
    }
}

exports.DataError = DataError

class ReadOnlyError extends Error {
    constructor (message = 'The mutating operation was attempted on a "readonly" transaction.') {
        super()
        this.name = 'ReadOnlyError'
        this.message = message
        this.code = 0
    }
}

exports.ReadOnlyError = ReadOnlyError

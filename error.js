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

class InvalidStateError extends DOMException {
    constructor (message = 'An operation was called on an object on which it is not allowed or at a time when it is not allowed. Also occurs if a request is made on a source object that has been deleted or removed. Use TransactionInactiveError or ReadOnlyError when possible, as they are more specific variations of InvalidStateError.') {
        super(message, 'InvalidStateError')
    }
}

exports.InvalidStateError = InvalidStateError

class TransactionInactiveError extends DOMException {
    constructor (message = 'A request was placed against a transaction which is currently not active, or which is finished.') {
        super(message, 'TransactionInactiveError')
    }
}

exports.TransactionInactiveError = TransactionInactiveError

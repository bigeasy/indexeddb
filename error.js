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

class NotFoundError extends DOMException {
    constructor (message = 'The operation failed because the requested database object could not be found. For example, an object store did not exist but was being opened.') {
        super(message, 'NotFoundError')
    }
}

exports.NotFoundError = NotFoundError

class AbortError extends DOMException {
    constructor (message = 'A request was aborted, for example through a call to IDBTransaction.abort.') {
        super(message, 'AbortError')
    }
}

exports.AbortError = AbortError

class VersionError extends DOMException {
    constructor (message = '**TODO** Error message.') {
        super(message, 'VersionError')
    }
}

exports.VersionError = VersionError

class ConstraintError extends DOMException {
    constructor (message = '**TODO** Error message.') {
        super(message, 'ConstraintError')
    }
}

exports.ConstraintError = ConstraintError

class InvalidAccessError extends DOMException {
    constructor (message = '**TODO** Error message.') {
        super(message, 'InvalidAccessError')
    }
}

exports.InvalidAccessError = InvalidAccessError

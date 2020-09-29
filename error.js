class DataError extends Error {
    constructor (message = 'Invalid data provided.') {
        super(message)
        this.name = 'DataError'
    }
}

exports.DataError = DataError

const DOMException = require('domexception')

class DataError extends DOMException {
    constructor (message = 'Invalid data provided.') {
        super(message, 'DataError')
    }
}

exports.DataError = DataError

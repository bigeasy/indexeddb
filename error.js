const DOMException = require('domexception')

class DataError extends DOMException {
    constructor (message = 'Invalid data provided.') {
        super('Something went wrong.', 'DataError')
    }
}

exports.DataError = DataError

const DOMException = require('domexception/lib/DOMException')

exports.key = function (globalObject, value, path = []) {
    switch (typeof value) {
    case 'number': {
            if (isNaN(value)) {
                throw DOMException.create(globalObject, [ 'TODO: message', 'DataError' ], {})
            }
            return value
        }
    case 'string': {
            return value
        }
    case 'object': {
            if (value instanceof Date) {
                if (isNaN(value.getTime())) {
                    throw DOMException.create(globalObject, [ 'TODO: message', 'DataError' ], {})
                }
                return value
            } else if (Array.isArray(value)) {
                const keys = [], subPath = path.concat(value)
                for (let i = 0, I = value.length; i < I; i++) {
                    if (! value.hasOwnProperty(i)) {
                        throw DOMException.create(globalObject, [ 'TODO: message', 'DataError' ], {})
                    }
                    if (~path.indexOf(value[i])) {
                        throw DOMException.create(globalObject, [ 'TODO: message', 'DataError' ], {})
                    }
                    keys.push(exports.key(globalObject, value[i], subPath))
                }
                return keys
            }
            throw DOMException.create(globalObject, [ 'TODO: message', 'DataError' ], {})
        }
    default: {
            throw DOMException.create(globalObject, [ 'TODO: message', 'DataError' ], {})
        }
    }
}

const DOMException = require('domexception/lib/DOMException')

// https://w3c.github.io/IndexedDB/#convert-a-value-to-a-input
const valuify = exports.valuify = function (globalObject, value) {
    switch (typeof value) {
    case 'number':
        if (isNaN(value)) {
            throw DOMException.create(globalObject, [ 'TODO: message', 'DataError' ], {})
        }
        return value
    case 'string':
        return value
    case 'object':
        if (value instanceof Date) {
            if (isNaN(value.valueOf())) {
                throw new DataError
            }
            return value
        } else if (value instanceof ArrayBuffer) {
            return new Uint8Array(value).buffer
        } else if (ArrayBuffer.isView(value)) {
            return value.buffer
        } else if (Array.isArray(value)) {
            const converted = []
            for (let i = 0, I = value.length; i < I; i++) {
                converted[i] = valuify(globalObject, value[i])
            }
            return converted
        } else {
            throw DOMException.create(globalObject, [ 'TODO: message', 'DataError' ], {})
        }
    default:
        console.log('>>>', globalObject)
        throw DOMException.create(globalObject, [ 'TODO: message', 'DataError' ], {})
    }
}

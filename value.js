const { DataError } = require('./error')

// https://w3c.github.io/IndexedDB/#convert-a-value-to-a-input
const valuify = exports.valuify = function (value) {
    switch (typeof value) {
    case 'number':
        if (isNaN(value)) {
            throw new DataError
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
                converted[i] = valuify(value[i])
            }
            return converted
        } else {
            throw new DataError
        }
    default:
        throw new DataError
    }
}

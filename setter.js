const DOMException = require('domexception/lib/DOMException')

exports.vivify = function (globalObject, object, path, value) {
    const parts = path.split('.')
    let iterator = object
    while (parts.length != 1) {
        const part = parts.shift()
        if (! iterator.hasOwnProperty(part)) {
            Object.defineProperty(iterator, part, { value: {}, enumerable: true, configurable: true, writable: true })
        }
        const object = iterator[part]
        if (typeof object !== 'object' || object === null || Array.isArray(object)) {
            throw DOMException.create(globalObject, [ 'TODO: message', 'DataError' ], {})
        }
        iterator = object
    }
    Object.defineProperty(iterator, parts[0], { value: value, enumerable: true, configurable: true, writable: true })
}

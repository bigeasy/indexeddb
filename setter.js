const DOMException = require('domexception/lib/DOMException')

exports.vivify = function (globalObject, object, path, value) {
    const parts = path.split('.')
    let iterator = object
    while (parts.length != 1) {
        const part = parts.shift()
        if (! iterator[part]) {
            const object = {}
            iterator[part] = object
            if (iterator[part] !== object) {
                throw DOMException.create(globalObject, [ 'TODO: message', 'DataError' ], {})
            }
        }
        iterator = iterator[part]
    }
    iterator[parts[0]] = value
    if (iterator[parts[0]] !== value) {
        throw DOMException.create(globalObject, [ 'TODO: message', 'DataError' ], {})
    }
}

const DOMException = require('domexception/lib/DOMException')
const identifier = new RegExp(`^${require('./identifier.json')}$`)

exports.create = function (path) {
    function extractor (path) {
        if (path == '') {
            return function (object) {
                return object
            }
        }
        const parts = path.split('.')
        return function (object) {
            let i = 0
            while (object != null && parts.length != i) {
                object = object[parts[i++]]
            }
            return object
        }
    }
    if (typeof path == 'string') {
        return extractor(path)
    } else {
        const fields = []
        for (const field of path) {
            fields.push(extractor(field))
        }
        return function (object) {
            return fields.map(field => field(object))
        }
    }
}

exports.verify = function (globalObject, keyPath) {
    function verify (path) {
        if (typeof path != 'string') {
            throw DOMException.create(globalObject, [ 'TODO: message ' + path, 'SyntaxError' ], {})
        }
        if (path == '') {
            return false
        }
        const parts = path.split('.')
        for (const part of parts) {
            if (! identifier.test(part)) {
                throw DOMException.create(globalObject, [ 'TODO: message ' + part, 'SyntaxError' ], {})
            }
        }
        return true
    }
    if (Array.isArray(keyPath)) {
        if (keyPath.length == 0) {
            throw DOMException.create(globalObject, [ 'TODO: message', 'SyntaxError' ], {})
        }
        for (const path of keyPath) {
            verify(path)
        }
        return false
    }
    return verify(keyPath)
}

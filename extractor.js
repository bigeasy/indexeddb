const DOMException = require('domexception/lib/DOMException')
const identifier = new RegExp(`^${require('./identifier.json')}$`)

function extractify (globalObject, path) {
    if (path == null) {
        console.log(new Error().stack)
        process.exit(1)
    }
    console.log('.... called')
    function extractor (path) {
        if (path == '') {
            return function (object) {
                return object
            }
        }
        const parts = path.split('.')
        for (const part of parts) {
            if (! identifier.test(part)) {
                throw DOMException.create(globalObject, [ 'TODO: message', 'SyntaxError' ], {})
            }
        }
        // TODO Assert valid JavaScript identifier.
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
    }
    if (Array.isArray(path)) {
        const fields = []
        for (const field of path) {
            fields.push(extractor(field))
        }
        return function (object) {
            return fields.map(field => field(object))
        }
    }
    throw new Error
}

exports.extractify = extractify

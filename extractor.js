function extractify (path) {
    function extractor (path) {
        if (path == '') {
            return function (object) {
                return object
            }
        }
        const parts = path.split('.')
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

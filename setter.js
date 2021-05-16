exports.vivify = function (object, path, value) {
    const parts = path.split('.')
    let iterator = object
    while (parts.length != 1) {
        const part = parts.shift()
        if (! iterator[part]) {
            iterator[part] = {}
        }
    }
    iterator[parts.shift()] = value
}

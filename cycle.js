function cyclical (value, path) {
    if (typeof value == 'object') {
        if (~path.indexOf(value)) {
            return true
        }
        const subPath = path.concat(path)
        if (Array.isArray(value)) {
            for (const element of value) {
                if (cyclical(element, subPath)) {
                }
            }
        }
    }
    return false
}

module.exports = function (value) {
    return ! cyclical(value, [])
}

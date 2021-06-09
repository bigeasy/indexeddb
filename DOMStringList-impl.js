const { supportedPropertyIndices, supportsPropertyIndex } = require('./living/generated/utils')

class DOMStringListImpl {
    constructor (globalObject, args, { array = [] }) {
        this._array = array
    }

    get length () {
        return this._array.length
    }

    contains (string) {
        return ~this._array.indexOf(string)
    }

    item (i) {
        return this._array[i]
    }

    [supportsPropertyIndex]() {
        return true
    }

    get [supportedPropertyIndices]() {
        return this._array.map((value, index) => index)
    }
}

module.exports = { implementation: DOMStringListImpl }

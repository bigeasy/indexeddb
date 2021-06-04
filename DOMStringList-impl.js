class DOMStringListImpl extends Array {
    constructor (globalObject, args, { array = [] }) {
        this.push.apply(this, array)
    }

    contains (string) {
        return ~this.indexOf(string)
    }

    item (i) {
        return this[i]
    }
}

module.exports = { implemenation: DOMStringListImpl }

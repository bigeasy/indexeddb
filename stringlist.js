class DOMStringList extends Array {
    contains (string) {
        return ~this.indexOf(string)
    }

    item (i) {
        return this[i]
    }
}

exports.DOMStringList = DOMStringList

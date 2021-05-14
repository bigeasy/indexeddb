class DBKeyRange {
    constructor (lower, upper) {
        this._lower = lower
        this._upper = upper
    }

    get lower () {
        return this._lower
    }

    get upper () {
        return this._upper
    }

    get lowerOpen () {
        throw new Error
    }

    get upperOpen () {
        throw new Error
    }

    static only (value) {
        throw new Error
    }

    static lowerBound (lower, open = false) {
        throw new Error
    }

    static upperBound (upper, open = false) {
        throw new Error
    }

    static bound (lower, upper, lowerOpen = false, upperOpen = false) {
        throw new Error
    }

    includes (key) {
        throw new Error
    }
}

exports.DBKeyRange = DBKeyRange

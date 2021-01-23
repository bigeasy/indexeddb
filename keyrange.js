class DBKeyRange {
    get lower () {
        throw new Error
    }

    get upper () {
        throw new Error
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

module.exports = DBKeyRange

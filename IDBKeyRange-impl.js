const compare = require('./compare')

const { valuify } = require('./value')

class IDBKeyRange {
    constructor (globalObject, [ lower, upper, lowerOpen, upperOpen ]) {
        this._lower = lower
        this._upper = upper
        this._lowerOpen = lowerOpen
        this._upperOpen = upperOpen
    }

    get lower () {
        return this._lower
    }

    get upper () {
        return this._upper
    }

    get lowerOpen () {
        return this._lowerOpen
    }

    get upperOpen () {
        return this._upperOpen
    }

    includes (key) {
        const value = valuify(key)
        return (
            this._lower === undefined || compare(value, this._lower) >= (this._lowerOpen ? 1 : 0)
        ) && (
            this._upper === undefined || compare(value, this._upper) <= (this._upperOpen ? -1 : 0)
        )
    }
}

module.exports = { implementation: IDBKeyRange }

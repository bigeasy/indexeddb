class Cursor {
    get source () {
        throw new Error
    }

    get direction () {
        throw new Error
    }

    get key () {
        throw new Error
    }

    get primaryKey () {
        throw new Error
    }

    advance (count) {
        throw new Error
    }

    continue (key) {
        throw new Error
    }

    continuePrimaryKey (key, primaryKey) {
        throw new Error
    }

    update (value) {
        throw new Error
    }

    delete () {
        throw new Error
    }
}

module.exports = Cursor

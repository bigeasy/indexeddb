const { valuify, MAX } = require('./value')

function is (globalObject, object) {
    switch (typeof object) {
    case 'string':
    case 'number':
        return typeof object
    default:
        if (object instanceof ArrayBuffer) {
            return 'binary'
        }
        if (object instanceof Date) {
            return 'date'
        }
        if (Array.isArray(object)) {
            return 'array'
        }
    }
    throw new Error
}

module.exports = function compare (globalObject, left, right) {
    if (arguments.length != 3) {
        throw new TypeError
    }
    if (left === MAX) {
        return 1
    }
    if (right === MAX) {
        return -1
    }
    // TODO: Why am I converting to a value every time?
    left = valuify(globalObject, left)
    right = valuify(globalObject, right)
    const type = { left: is(globalObject, left), right: is(globalObject, right) }
    if (type.left != type.right) {
        switch (type.left) {
        case 'array':
            return 1
        case 'binary':
            switch (type.right) {
            case 'string':
            case 'date':
            case 'number':
                return 1
            }
            break
        case 'string':
            switch (type.right) {
            case 'date':
            case 'number':
                return 1
            }
            break
        case 'date':
            if  (type.right == 'number') {
                return 1
            }
            break
        }
        return -1
    }
    switch (type.left) {
    case 'array':
        for (let i = 0, I = Math.min(left.length, right.length); i < I; i++) {
            const diff = compare(globalObject, left[i], right[i])
            if (diff != 0) {
                return diff
            }
        }
        return  (left.length > right.length) - (left.length < right.length)
    case 'binary':
        left = new Uint8Array(left)
        right = new Uint8Array(right)
        for (let i = 0, I = Math.min(left.length, right.length); i < I; i++) {
            const diff = (left[i] > right[i]) - (left[i] < right[i])
            if (diff != 0) {
                return diff
            }
        }
        return  (left.length > right.length) - (left.length < right.length)
    case 'date':
        if (left.getTime() == right.getTime()) {
            return 0
        }
        break
    default:
        if (left == right) {
            return 0
        }
        break
    }
    return left > right ? 1 : -1
}

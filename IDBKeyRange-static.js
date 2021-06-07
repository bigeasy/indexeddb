const IDBKeyRangeImpl = require('./IDBKeyRange-impl')
const IDBKeyRange = require('./living/generated/IDBKeyRange')

const { valuify } = require('./value')

exports.patch = function (globalObject) {
    globalObject.IDBKeyRange.bound = function (lower, upper, lowerOpen = false, upperOpen = false) {
        return IDBKeyRange.create(globalObject, [ valuify(globalObject, lower), valuify(globalObject, upper), lowerOpen, upperOpen ], {})
    }
    globalObject.IDBKeyRange.upperBound = function (upper, open = false) {
        return IDBKeyRange.create(globalObject, [ undefined, valuify(globalObject, upper), undefined, open ], {})
    }
    globalObject.IDBKeyRange.lowerBound = function (lower, open = false) {
        return IDBKeyRange.create(globalObject, [ valuify(globalObject, lower), undefined, open, undefined ], {})
    }
    globalObject.IDBKeyRange.only = function (only) {
        return globalObject.IDBKeyRange.bound(only, only)
    }
}

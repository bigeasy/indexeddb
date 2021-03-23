// # IndexedDB
//
// Issues requiring interpretation of the spec.
//
//  * What is `legacyOutputDidListenersThrowFlag`? Possible related
//  [issue](https://github.com/w3c/IndexedDB/issues/140).

//
const path = require('path')

const { DBFactory } = require('./factory')

exports.create = function (directroy) {
    return new DBFactory(directroy)
}

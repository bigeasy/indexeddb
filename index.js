const path = require('path')

const { DBFactory } = require('./factory')

exports.create = function (directroy) {
    return new DBFactory(directroy)
}

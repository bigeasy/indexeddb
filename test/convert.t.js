require('proof')(5, okay => {
    const convert = require('../convert')

    const DOMException = require('domexception/lib/DOMException')

    const globalObject = {}

    DOMException.install(globalObject, [ 'Window' ])

    const errors = []

    okay(convert.key(globalObject, 1), 1, 'convert number')
    try {
        convert.key(globalObject, NaN)
    } catch (error) {
        errors.push(error.name == 'DataError')
    }
    okay(convert.key(globalObject, 'hello'), 'hello', 'string')
    okay(convert.key(globalObject, new Date(0)).getTime(), 0, 'date')
    try {
        convert.key(globalObject, new Date(NaN))
    } catch (error) {
        errors.push(error.name == 'DataError')
    }
    try {
        convert.key(globalObject, {})
    } catch (error) {
        errors.push(error.name == 'DataError')
    }
    okay(convert.key(globalObject, [ 1 ]), [ 1 ], 'array')
    // `x.hasOwnProperty(0) === false`
    try {
        const x = []
        Object.setPrototypeOf(x, [ 1 ])
        x[1] = 2
        convert.key(globalObject, x)
    } catch (error) {
        errors.push(error.name == 'DataError')
    }
    try {
        let x = []
        x[0] = x
        convert.key(globalObject, x)
    } catch (error) {
        errors.push(error.name == 'DataError')
    }
    try {
        convert.key(globalObject, function () {})
    } catch (error) {
        errors.push(error.name == 'DataError')
    }
    okay(errors, [ true, true, true, true, true, true ], 'errors')
})

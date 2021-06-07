require('proof')(20, okay => {
    const comparator = require('../compare')
    const WrapperDOMException = require("domexception/webidl2js-wrapper")
    const globalObject = {}
    globalObject.Error = Error
    WrapperDOMException.install(globalObject)
    const compare = (left, right) => comparator(globalObject, left, right)
    const test = []
    try {
        compare(1, {})
    } catch (error) {
        console.log(error.stack)
        test.push(error instanceof globalObject.DOMException)
    }
    okay(test, [ true ], 'type error')
    okay(compare([], 1) > 0, 'array to number')
    okay(compare(new ArrayBuffer(0), 'x') > 0, 'binary to string')
    okay(compare(new ArrayBuffer(0), new Date) > 0, 'binary to date')
    okay(compare(new ArrayBuffer(0), 1) > 0, 'binary to number')
    okay(compare('x', new Date) > 0, 'string to date')
    okay(compare('x', 1) > 0, 'string to number')
    okay(compare(new Date, 1) > 0, 'date to number')
    okay(compare(new ArrayBuffer(0), []) < 0, 'binary to array')
    okay(compare('x', []) < 0, 'string to array')
    okay(compare(new Date, []) < 0, 'date to array')
    okay(compare(1, []) < 0, 'number to array')
    okay(compare([ 1 ], [ 1 ]) == 0, 'array equal')
    okay(compare([ 0 ], [ 1 ]) < 0, 'array less than')
    okay(compare([ 1, 1 ], [ 1 ]) > 0, 'array longer than')
    okay(compare(Uint8Array.of(1).buffer, Uint8Array.of(1).buffer) == 0, 'binary equal')
    okay(compare(Uint8Array.of(0).buffer, Uint8Array.of(1).buffer) < 0, 'binary less than')
    okay(compare(Uint8Array.of(1, 1).buffer, Uint8Array.of(1).buffer) > 0, 'binary longer than')
    okay(compare(new Date(1), new Date(1)) == 0, 'date equal')
    okay(compare(new Date(2), new Date(1)) > 0, 'date greater than')
})

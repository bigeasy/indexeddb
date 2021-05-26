require('proof')(4, okay => {
    const { extractify } = require('../extractor')
    okay(extractify('key')({ key: 1 }), 1, 'single')
    okay(extractify('')([]), [], 'no path')
    okay(extractify([ 'key', 'value' ])({ key: 1, value: 2 }), [ 1, 2 ], 'array')
    const errors = []
    try {
        extractify({})
    } catch (e) {
        errors.push(true)
    }
    okay(errors, [ true ], 'not a path')
})

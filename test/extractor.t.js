require('proof')(4, okay => {
    const { extractify } = require('../extractor')
    okay(extractify(null, 'key')({ key: 1 }), 1, 'single')
    okay(extractify(null, '')([]), [], 'no path')
    okay(extractify(null, [ 'key', 'value' ])({ key: 1, value: 2 }), [ 1, 2 ], 'array')
    const errors = []
    try {
        extractify(null, {})
    } catch (e) {
        errors.push(true)
    }
    okay(errors, [ true ], 'not a path')
})

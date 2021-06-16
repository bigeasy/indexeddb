require('proof')(4, okay => {
    const extractor = require('../extractor')
    okay(extractor.create('key')({ key: 1 }), 1, 'single')
    okay(extractor.create('')([]), [], 'no path')
    okay(extractor.create([ 'key', 'value' ])({ key: 1, value: 2 }), [ 1, 2 ], 'array')
    const errors = []
    try {
        extractor.create(null, {})
    } catch (e) {
        errors.push(true)
    }
    okay(errors, [ true ], 'not a path')
})

require('proof')(17, okay => {
    const IDBKeyRange = require('../living/generated/IDBKeyRange')

    const globalObject = {}

    IDBKeyRange.install(globalObject, [ 'Window' ])

    require('../IDBKeyRange-static').patch(globalObject)

    const bound = globalObject.IDBKeyRange.bound(1, 3)

    okay(! bound.includes(0), 'before lower bound')
    okay(bound.includes(1), 'includes lowest bound')
    okay(bound.includes(2), 'includes midpoint')
    okay(bound.includes(3), 'includes upper bound')
    okay(! bound.includes(4), 'beyond upper bound')

    const lower = globalObject.IDBKeyRange.lowerBound(1)

    okay(! lower.includes(0), 'before lower bound')
    okay(lower.includes(1), 'at lower bound')
    okay(lower.includes(999), 'way beyond lower bound')

    const upper = globalObject.IDBKeyRange.upperBound(3)

    okay(! upper.includes(4), 'beyond upper bound')
    okay(upper.includes(3), 'at upper bound')
    okay(upper.includes(-999), 'way before lower bound')

    const closed = globalObject.IDBKeyRange.bound(1, 3, true, true)
    okay(! closed.includes(1), 'exclude lower bound')
    okay(closed.includes(2), 'within closed bound')
    okay(! closed.includes(3), 'exclude upper bound')

    const only = globalObject.IDBKeyRange.only(2)
    okay(! closed.includes(1), 'exclude only lower')
    okay(closed.includes(2), 'only')
    okay(! closed.includes(3), 'exclude only upper')
})

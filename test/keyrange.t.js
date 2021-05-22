require('proof')(17, okay => {
    const { DBKeyRange } = require('../keyrange')
    const bound = DBKeyRange.bound(1, 3)

    okay(! bound.includes(0), 'before lower bound')
    okay(bound.includes(1), 'includes lowest bound')
    okay(bound.includes(2), 'includes midpoint')
    okay(bound.includes(3), 'includes upper bound')
    okay(! bound.includes(4), 'beyond upper bound')

    const lower = DBKeyRange.lowerBound(1)

    okay(! lower.includes(0), 'before lower bound')
    okay(lower.includes(1), 'at lower bound')
    okay(lower.includes(999), 'way beyond lower bound')

    const upper = DBKeyRange.upperBound(3)

    okay(! upper.includes(4), 'beyond upper bound')
    okay(upper.includes(3), 'at upper bound')
    okay(upper.includes(-999), 'way before lower bound')

    const closed = DBKeyRange.bound(1, 3, true, true)
    okay(! closed.includes(1), 'exclude lower bound')
    okay(closed.includes(2), 'within closed bound')
    okay(! closed.includes(3), 'exclude upper bound')

    const only = DBKeyRange.only(2)
    okay(! closed.includes(1), 'exclude only lower')
    okay(closed.includes(2), 'only')
    okay(! closed.includes(3), 'exclude only upper')
})

require('proof')(4, okay => {
    const DOMStringList = require('../living/generated/DOMStringList')
    const globalObject = {}
    DOMStringList.install(globalObject, [ 'Window' ])

    const list = DOMStringList.create(globalObject, [], { array: [ 'a', 'b', 'c' ] })

    okay(list.contains('b'), 'contains')
    okay(! list.contains('z'), 'does not contain')
    okay(list.item(1), 'b', 'item')
    okay(list[1], 'indexed get')
})

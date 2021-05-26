require('proof')(4, okay => {
    const Transactor = require('../transactor')
    const transactor = new Transactor

    const shifter = transactor.queue.sync.shifter()

    let started = false
    transactor.transaction('request', [ 'chairs' ], true)
    okay(shifter.shift(), {
        method: 'transact',
        names: [ 'chairs' ],
        readOnly: true,
        extra: 'request'
    }, 'started')
    transactor.transaction('request', [ 'chairs', 'locations' ], true)
    okay(shifter.shift(), {
        method: 'transact',
        names: [ 'chairs', 'locations' ],
        readOnly: true,
        extra: 'request'
    }, 'started')
    transactor.transaction('blocked write', [ 'locations' ], false)
    debugger
    okay(shifter.shift(), null, 'blocked write')
    transactor.complete([ 'chairs', 'locations' ])
    okay(shifter.shift(), {
        method: 'transact',
        names: [ 'locations' ],
        readOnly: false,
        extra: 'blocked write'
    }, 'unblocked write')
})

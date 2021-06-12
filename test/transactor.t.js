require('proof')(17, okay => {
    const Transactor = require('../transactor')

    {
        const transactor = new Transactor
        const shifter = transactor.queue.sync.shifter()
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
        okay(shifter.shift(), null, 'blocked write')
        transactor.complete([ 'chairs', 'locations' ])
        okay(shifter.shift(), {
            method: 'transact',
            names: [ 'locations' ],
            readOnly: false,
            extra: 'blocked write'
        }, 'unblocked write')
    }
    {
        const transactor = new Transactor
        const shifter = transactor.queue.sync.shifter()
        transactor.transaction('request', [ 'a' ], false)
        transactor.transaction('request', [ 'a', 'b' ], false)
        transactor.transaction('request', [ 'b', 'c' ], true)
        okay(shifter.shift(), {
            method: 'transact',
            names: [ 'a' ],
            readOnly: false,
            extra: 'request'
        }, 'started')
        okay(shifter.shift(), null, 'blocked write')
        transactor.complete([ 'a' ])
        okay(shifter.shift(), {
            method: 'transact',
            names: [ 'a', 'b' ],
            readOnly: false,
            extra: 'request'
        }, 'started')
        transactor.complete([ 'a', 'b' ])
        okay(shifter.shift(), {
            method: 'transact',
            names: [ 'b', 'c' ],
            readOnly: true,
            extra: 'request'
        }, 'started')
    }
    {
        const transactor = new Transactor
        const shifter = transactor.queue.sync.shifter()
        transactor.transaction('request', [ 'a', 'c' ], true)
        transactor.transaction('request', [ 'a', 'b' ], true)
        transactor.transaction('request', [ 'a', 'c' ], false)
        transactor.transaction('request', [ 'a' ], true)
        okay(shifter.shift(), {
            method: 'transact',
            names: [ 'a', 'c' ],
            readOnly: true,
            extra: 'request'
        }, 'started')
        okay(shifter.shift(), {
            method: 'transact',
            names: [ 'a', 'b' ],
            readOnly: true,
            extra: 'request'
        }, 'parallel read')
        okay(shifter.shift(), null, 'blocked write')
        transactor.complete([ 'a', 'b' ])
        okay(shifter.shift(), null, 'still blocked write')
        transactor.complete([ 'a', 'c' ])
        okay(shifter.shift(), {
            method: 'transact',
            names: [ 'a', 'c' ],
            readOnly: false,
            extra: 'request'
        }, 'still blocked write')
        okay(shifter.shift(), null, 'blocked read')
        transactor.complete([ 'a', 'c' ])
        okay(shifter.shift(), {
            method: 'transact',
            names: [ 'a' ],
            readOnly: true,
            extra: 'request'
        }, 'unblocked read')
        okay(shifter.shift(), null, 'empty')
    }
    {
        const transactor = new Transactor
        const shifter = transactor.queue.sync.shifter()
        transactor.transaction('request', [ 'a' ], true)
        transactor.transaction('request', [ 'a' ], true)
        okay([ shifter.shift(), shifter.shift(), shifter.shift() ], [{
            method: 'transact',
            names: [ 'a' ],
            readOnly: true,
            extra: 'request'
        }, {
            method: 'transact',
            names: [ 'a' ],
            readOnly: true,
            extra: 'request'
        }, null ], 'parallel read')
        transactor.complete([ 'a' ])
        transactor.complete([ 'a' ])
    }
})

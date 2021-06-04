require('proof')(6, okay => {
    const Event = require('../living/generated/Event')
    const EventTarget = require('../living/generated/EventTarget')

    const IDBRequest = require('../living/generated/IDBRequest')
    const IDBOpenDBRequest = require('../living/generated/IDBOpenDBRequest')

    const object = {}

    const interfaces = require('../interfaces')

    EventTarget.install(object, [ 'Window' ])
    Event.install(object, [ 'Window' ])
    IDBRequest.install(object, [ 'Window' ])
    IDBOpenDBRequest.install(object, [ 'Window' ])

    const request = IDBRequest.create(object, [], {})
    okay(request.readyState, 'pending', 'readyState')
    okay(request.result, null, 'result')

    const event = Event.create(object, [ 'success' ], {})

    const test = []
    request.onsuccess = function () { test.push('called') }

    request.dispatchEvent(event)

    okay(test, [ 'called' ], 'called')
    request.dispatchEvent(event)

    okay(test, [ 'called', 'called' ], 'called with recycled event')

    EventTarget.convert(request)._dispatch(Event.convert(event), null, true)
    okay(test, [ 'called', 'called', 'called' ], 'called with did listeners error flag')

    const openRequest = IDBOpenDBRequest.create(object, [], {})

    openRequest.onblocked = function () { test.push('blocked') }
    openRequest.dispatchEvent(Event.create(object, [ 'blocked' ], {}))
    okay(test, [ 'called', 'called', 'called', 'blocked' ], 'called with did listeners error flag')
})

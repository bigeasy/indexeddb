require('proof')(2, okay => {
    const Event = require('../living/generated/Event')
    const EventTarget = require('../living/generated/EventTarget')

    const object = {}

    EventTarget.install(object, [ 'Window' ])
    Event.install(object, [ 'Window' ])

    console.log(new object.EventTarget)

    class Targetable extends object.EventTarget {
        constructor () {
            super()
        }
    }

    const targetable = new Targetable

    targetable.addEventListener('hello', () => { throw new Error })

    const event = new object.Event('hello')
    okay(event.type, 'hello', 'event')
    EventTarget.convert(targetable)._dispatch(Event.convert(event), false, true)
    okay(Event.convert(event)._legacyOutputDidListenersThrowFlag, 'legacy output did listeners throw flag')
})

require('proof')(1, okay => {
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

    targetable.addEventListener('hello', () => console.log('hello'))

    targetable.dispatchEvent(new object.Event('hello'))
    okay(new object.Event('hello').type, 'hello', 'event')
})

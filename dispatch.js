const assert = require('assert')

const Event = require('./living/generated/Event')
const EventTarget = require('./living/generated/EventTarget')

const kTarget = Symbol('TARGET')

// Getting started here. Existing API for `event-target-shim` works, but doesn't
// allow me to reset a user's handler if one exists. Wouldn't it be nice if
// `event-target-shim` returned an existing error handler if one exists?
function dispatchEvent (tx, eventTarget, event) {
    try {
    assert(arguments.length == 3)
    const caught = []
    if (tx != null) {
        tx._state = 'active'
    }
    const eventImpl = Event.convert(event)
    EventTarget.convert(eventTarget)._dispatch(Event.convert(event), false, true)
    if (tx != null && tx._state == 'active') {
        tx._state = 'inactive'
    }
    if (eventImpl._legacyOutputDidListenersThrowFlag) {
        console.log('LEGACY OUTPUT DID LISTENERS THROW')
        throw new Error
    }
    return caught
    } catch (error) {
        console.log(error.stack)
    }
}

exports.dispatchEvent = dispatchEvent

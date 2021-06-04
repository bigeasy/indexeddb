const assert = require('assert')

const Event = require('./living/generated/Event')
const EventTarget = require('./living/generated/EventTarget')

const webidl = require('./living/generated/utils')

// Getting started here. Existing API for `event-target-shim` works, but doesn't
// allow me to reset a user's handler if one exists. Wouldn't it be nice if
// `event-target-shim` returned an existing error handler if one exists?
function dispatchEvent (transaction, eventTargetImpl, eventImpl) {
    assert(arguments.length == 3)
    webidl.tryWrapperForImpl(eventImpl)
    if (transaction != null) {
        transaction._state = 'active'
    }
    eventTargetImpl._dispatch(eventImpl, false, true)
    if (transaction != null && transaction._state == 'active') {
        transaction._state = 'inactive'
    }
    if (eventImpl._legacyOutputDidListenersThrowFlag) {
        console.log('LEGACY OUTPUT DID LISTENERS THROW')
        throw new Error
    }
}

exports.dispatchEvent = dispatchEvent

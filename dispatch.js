const assert = require('assert')

const { setErrorHandler } = require('event-target-shim')

// Getting started here. Existing API for `event-target-shim` works, but doesn't
// allow me to reset a user's handler if one exists. Wouldn't it be nice if
// `event-target-shim` returned an existing error handler if one exists?
function dispatchEvent (tx, eventTarget, event) {
    assert(arguments.length == 3)
    const caught = []
    setErrorHandler(error => caught.push(error))
    if (tx != null) {
        tx._state = 'active'
    }
    eventTarget.dispatchEvent(event)
    if (tx != null && tx._state == 'active') {
        tx._state = 'inactive'
    }
    setErrorHandler()
    if (caught.length != 0) {
        console.log(caught[0].stack)
    }
    return caught
}

exports.dispatchEvent = dispatchEvent

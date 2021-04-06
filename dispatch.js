const { setErrorHandler } = require('event-target-shim')

// Getting started here. Existing API for `event-target-shim` works, but doesn't
// allow me to reset a user's handler if one exists. Wouldn't it be nice if
// `event-target-shim` returned an existing error handler if one exists?
function dispatchEvent (eventTarget, event) {
    const caught = []
    setErrorHandler(error => caught.push(error))
    eventTarget.dispatchEvent(event)
    setErrorHandler()
    if (caught.length != 0) {
        console.log(caught[0].stack)
    }
    return caught
}

exports.dispatchEvent = dispatchEvent

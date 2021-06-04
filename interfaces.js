const Event = require('./living/generated/Event')
const EventTarget = require('./living/generated/EventTarget')
const IDBRequest = require('./living/generated/IDBRequest')
const IDBOpenDBRequest = require('./living/generated/IDBOpenDBRequest')
const IDBVersionChangeEvent = require('./living/generated/IDBVersionChangeEvent')

EventTarget.install(exports, [ 'Window' ])
Event.install(exports, [ 'Window' ])
IDBRequest.install(exports, [ 'Window' ])
IDBOpenDBRequest.install(exports, [ 'Window' ])
IDBVersionChangeEvent.install(exports, [ 'Window' ])

exports.getEventAttributeValue = function (target, event) {
}

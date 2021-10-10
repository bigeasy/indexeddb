// # IndexedDB
//
// Issues requiring interpretation of the spec.
//
//  * What is `legacyOutputDidListenersThrowFlag`? Possible related
//  [issue](https://github.com/w3c/IndexedDB/issues/140).

//
const path = require('path')

const Event = require('./living/generated/Event')
const EventTarget = require('./living/generated/EventTarget')
const IDBRequest = require('./living/generated/IDBRequest')
const IDBOpenDBRequest = require('./living/generated/IDBOpenDBRequest')
const IDBVersionChangeEvent = require('./living/generated/IDBVersionChangeEvent')
const IDBFactory = require('./living/generated/IDBFactory')
const IDBDatabase = require('./living/generated/IDBDatabase')
const IDBTransaction = require('./living/generated/IDBTransaction')
const IDBObjectStore = require('./living/generated/IDBObjectStore')
const IDBKeyRange = require('./living/generated/IDBKeyRange')
const IDBIndex = require('./living/generated/IDBIndex')
const IDBCursor = require('./living/generated/IDBCursor')
const IDBCursorWithValue = require('./living/generated/IDBCursorWithValue')
const DOMStringList = require('./living/generated/DOMStringList')
const WrapperDOMException = require("domexception/webidl2js-wrapper")

require('./global').add(exports)

exports.Error = Error

EventTarget.install(exports, [ 'Window' ])
Event.install(exports, [ 'Window' ])
IDBRequest.install(exports, [ 'Window' ])
IDBOpenDBRequest.install(exports, [ 'Window' ])
IDBVersionChangeEvent.install(exports, [ 'Window' ])
IDBFactory.install(exports, [ 'Window' ])
IDBDatabase.install(exports, [ 'Window' ])
IDBTransaction.install(exports, [ 'Window' ])
IDBObjectStore.install(exports, [ 'Window' ])
IDBKeyRange.install(exports, [ 'Window' ])
IDBIndex.install(exports, [ 'Window' ])
IDBCursor.install(exports, [ 'Window' ])
IDBCursorWithValue.install(exports, [ 'Window' ])
DOMStringList.install(exports, [ 'Window' ])
WrapperDOMException.install(exports, [ 'Window' ])

require('./IDBKeyRange-static').patch(exports)

exports.create = function (destructible, directory) {
    return IDBFactory.create(exports, [], { destructible, directory })
}

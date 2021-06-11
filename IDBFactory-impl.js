// Node.js API.
const assert = require('assert')
const fs = require('fs').promises
const path = require('path')

// Do nothing.
const noop = require('nop')

// Catch exceptions by type or properties.
const rescue = require('rescue')

// In-memory model of IndexedDB schema.
const Schema = require('./schema')

// A future wrapper around a Promise.
const { Future } = require('perhaps')

// Controlled demoltion of `async`/`await` stacks.
const Destructible = require('destructible')

// An `async`/`await` indexed, concurrent, transactional, persistent database.
const Memento = require('memento')

// IndexedDB key comparison implemenation.
const comparator = require('./compare')

// IndexedDB transaction scheduler implemenation.
const Transactor = require('./transactor')

// An evented, throttled work queue.
const Turnstile = require('turnstile')

// DOM interfaces swiped from JSDOM.
const EventTarget = require('./living/generated/EventTarget')
const Event = require('./living/generated/Event')

// IndexedDB interfaces.
const IDBRequest = require('./living/generated/IDBRequest')
const IDBOpenDBRequest = require('./living/generated/IDBOpenDBRequest')
const IDBVersionChangeEvent = require('./living/generated/IDBVersionChangeEvent')
const IDBDatabase = require('./living/generated/IDBDatabase')
const IDBTransaction = require('./living/generated/IDBTransaction')
const DOMException = require('domexception/lib/DOMException')

// WebIDL helpers.
const webidl = require('./living/generated/utils')

// Shim around recursive delete deprecation.
const rmrf = require('./rmrf')

// Create event accessors.
const { createEventAccessor } = require('./living/helpers/create-event-accessor')

// Extract keys from record objects.
const { extractify } = require('./extractor')

// Dispatch an event adjusted a transactions active state.
const { dispatchEvent } = require('./dispatch')

// We must implement a bridge between the W3C Event based interface of IndexedDB
// with the `async`/`await` interface of Memento. Ideally we might be able to
// map Memento environmental errors to the DOMException errors specified in the
// IndexedDB interface.

// At this point, I don't see a future where the user will simply
// `require('indexeddb')` and go. The user will always have to specify a
// directory in which to store the databases, I don't want to have a guess at
// that. As long as we have to implement a bootstrap interface, we may as well
// make the user aware of and responsible fore the detailed exceptions that come
// from `Destructible` and report them with any issues they open. Starting to
// imagine that maybe there is an error file somewhere, though, and warnings
// issues to standard error. If we could find a way to map the expected
// environmental errors to IndexedDB DOMExceptions, like maybe a full disk is
// mapped to a `QuotaError`, then maybe the `Destructible` error is reserved
// only for truly exceptional conditions.

// And yet, we do want to be able to close the Memento automatically according
// to the IndexedDB spec. That is closing the Memento store when the last
// connection closes.

// To facilitate this we have a collection of classes in this IDBFactory
// implementation.
//
// The IDBFactory itself manages a collection of Connector
// objects which manage the connection loop for a specific IndexedDB name (and
// origin.) The Connector will perform a database delete.

// The Connector will use an Opener to manage the Memento instance itself
// creating connections, that is opening with possible upgrading, or else
// creating a connection from the already-open Memento connection.

// Two are race conditions concern me, the Connector creation and deletion and
// the Opener creation and deletion. We'll call then the Connector race and the
// Opener race.

//
class Opener {
    constructor (destructible, connector) {
        this.destructible = destructible
        this._connector = connector
        this._transactor = new Transactor
        this._handles = []
        this.destructible.durable('transactions', this._transact())
    }

    // Close database for version change or delete.

    //
    async close (event) {
        for (const connection of this._handles) {
            if (! connection._closing) {
                dispatchEvent(null, connection, Event.createImpl(this._connector._factory._globalObject, [ 'versionchange' ], {}))
            }
        }
        // **TODO** No, it's a closing flag you're looking for.
        if (this._handles.some(connection => ! connection._closing)) {
            dispatchEvent(null, connection, Event.createImpl(this._connector._factory._globalObject, [ 'blocked' ], {}))
        }
        for (const connection of this._handles) {
            await connection._closed.promise
        }
    }

    // Opener race, if there are no handles we self-destruct. Once we are
    // destroyed our Connector will create a new Opener. However, how do we know
    // that a handle is not inbound on some path that has already checked
    // destroy and proceeded? Are there any asynchronous pauses between that
    // check and creation of an IDBDatabase instance? See below.

    //
    _maybeClose (db) {
        if (db._closing && db._transactions.size == 0) {
            const index = this._handles.indexOf(db)
            if (~index) {
                assert(index != -1)
                this._handles.splice(index, 1)
                db._closed.resolve()
                if (this._handles.length == 0) {
                    this.destructible.destroy()
                    this._transactor.queue.push(null)
                }
            }
        }
    }

    // Opener race, you can see the invocations below that reduce the
    // transaction set size and check for delete. These are going to happen in
    // ephemeral strands so that self-destruction in `_maybeClose` can occur at
    // any time. We really have no guards on this side of the race except to say
    // that the operations from transaction set reduction through
    // self-destruction are all synchronous.

    //
    async _transact () {
        let count = 0
        for await (const event of this._transactor.queue.shifter()) {
            switch (event.method) {
            case 'transact': {
                    const { extra: { db, transaction } } = event
                    this.destructible.ephemeral(`transaction.${count++}`, async () => {
                        if (transaction.mode == 'readonly') {
                            await this.memento.snapshot(snapshot => transaction._run(snapshot))
                        } else {
                            await this.memento.mutator(mutator => transaction._run(mutator))
                        }
                        db._transactions.delete(transaction)
                        this._maybeClose(db)
                        this._transactor.complete(transaction._names)
                    })
                }
            case 'close': {
                    const { extra: { db } } = event
                    this._maybeClose(db)
                }
                break
            }
        }
    }

    // Opener race. Our connection to a Memento that is already open is
    // synchronous and it will occur in the same tick in which the Connector
    // checks the destroyed property of our destructor, so we will be able to
    // push a handle into the handle set and prevent `_maybeClose` from
    // self-destructing.

    //
    connect (schema, { request }) {
        const db = IDBDatabase.createImpl(this._connector._factory._globalObject, [], {
            name: this._connector._name,
            schema: schema,
            transactor: this._transactor,
            version: this._connector._version
        })
        request.result = webidl.wrapperForImpl(db)
        this._handles.push(db)
    }

    // Opener race. If we open a new Opener, then we have determined that our
    // previous Opener has destroyed itself or else the versions are off and we
    // are going to force the previous Opener to close with `'versionchange'`
    // notifications so we can upgrade the database. We handle the upgrade
    // transaction differently than the read and read/write transactions. We
    // will run the upgrade transaction as part of this open function and we
    // will call `_maybeClose` also as part of this function. So, this
    // particular transaction will block the Connector's open/close loop so it
    // will not perform any tests against our `Destructible`'s `destroyed`
    // property, so we will be using the single-file open/close loop to guard
    // against the Opener race.

    //
    static async open (destructible, connector, schema, { request }) {
        // **TODO** `version` should be a read-only property of the
        // Memento object.
        const opener = new Opener(destructible, connector)
        await fs.mkdir(path.join(connector._factory._directory, connector._name), { recursive: true })
        const db = IDBDatabase.createImpl(connector._factory._globalObject, [], {
            name: connector._name,
            schema: schema,
            transactor: opener._transactor
        })
        request.result = webidl.wrapperForImpl(db)
        opener._handles.push(db)
        let current, transaction
        try {
            let upgraded = false
            // TODO Maybe Memento should have a version.current,
            // version.previous? Snapshot and Mutator return a result from the
            // user function, how would upgrade do same?
            opener.memento = await Memento.open({
                destructible: destructible.durable('memento'),
                turnstile: this._turnstile,
                version: connector._version,
                directory: path.join(connector._factory._directory, connector._name),
                comparators: { indexeddb: connector._factory.cmp }
            }, async upgrade => {
                current = upgrade.version.current
                db.version = upgrade.version.target
                if (upgrade.version.current == 0) {
                    await upgrade.store('schema', { 'id': Number })
                }
                const max = (await upgrade.cursor('schema').array()).pop()
                schema._root.max = max ? max.id + 1 : 0
                // **TODO** Really need to do a join.
                for await (const items of upgrade.cursor('schema').iterator()) {
                    for (const item of items) {
                        schema._root.store[item.id] = item
                        switch (item.type) {
                        case 'store':
                            schema._root.name[item.name] = item.id
                            break
                        case 'index':
                        }
                        if (item.keyPath != null) {
                            schema._root.extractor[item.id] = extractify(item.keyPath)
                        }
                    }
                }
                schema.reset()
                request.readyState = 'done'
                transaction = IDBTransaction.createImpl(connector._factory._globalObject, [], {
                    schema: schema,
                    database: db,
                    mode: 'versionchange',
                    previousVersion: upgrade.version.current
                })
                request.transaction = webidl.wrapperForImpl(transaction)
                db._transaction = transaction
                db._transactions.add(transaction)
                dispatchEvent(transaction, request, IDBVersionChangeEvent.createImpl(connector._factory._globalObject, [
                    'upgradeneeded', { newVersion: upgrade.version.target, oldVersion: upgrade.version.current }
                ], {}))
                await transaction._run(upgrade, [])
                // **TODO** What to do if the database is closed before we can
                // indicate success?
                db._transactions.delete(transaction)
                db._transaction = null
                // **TODO** This creates a race. If we close as the last action and
                // then sleep or something then our transact queue will close and we
                // will call maybe close with an already closed db.
                upgraded = true
            })
            if (! upgraded) {
                await opener.memento.snapshot(async snapshot => {
                    for await (const items of snapshot.cursor('schema').iterator()) {
                        for (const item of items) {
                            schema._root.store[item.id] = item
                            schema._root.name[item.name] = item.id
                            if (item.keyPath != null) {
                                schema._root.extractor[item.id] = extractify(item.keyPath)
                            }
                        }
                    }
                    schema.reset()
                })
            }
            opener._maybeClose(db)
            db.version = opener.memento.version
            request.readyState = 'done'
            return opener
        } catch (error) {
            rescue(error, [{ symbol: Memento.Error.ROLLBACK }])
            console.log('will abort error')
            db._transactions.delete(transaction)
            db._version = current
            db._closing = true
            opener._maybeClose(db)
            request.result = undefined
            request.transaction = null
            request.readyState = 'done'
            request._error = DOMException.create(connector._factory._globalObject, [ 'TODO: message', 'AbortError' ], {})
            dispatchEvent(null, request, Event.createImpl(connector._factory._globalObject, [
                'error', { bubbles: true, cancelable: true }
            ], {}))
            opener._transactor.queue.push({ method: 'close', extra: { db } })
            return { destructible: new Destructible('errored').destroy() }
        }
    }
}

// Manages the connection loop for a database origin and name.

//
class Connector {
    // Create a connector for the given name, use factory properties as needed.

    //
    constructor (destructible, factory, name) {
        // Destructible for the current connection loop.
        this.destructible = destructible
        // Factory and name.
        this._factory = factory
        this._name = name
        // Dummy previous opener, already destroyed.
        this._opener = { destructible: new Destructible('opener').destroy() }
        // Connection event loop and and notification signal.
        this._events = []
        this._sleep = Future.resolve()
        // Hold factory open until this connection is destroyed.
        factory.deferrable.increment()
        this.destructible.destruct(() => factory.deferrable.decrement())
        // Start a connection loop.
        this.destructible.durable('connections', this._connect({
            name: {}, store: {}, max: 0, index: {}, extractor: {}
        }))
    }

    // Push an open or delete event onto connection queue.

    //
    push (event) {
        assert(! this.destructible.destroyed)
        this._events.push(event)
        this._sleep.resolve()
    }

    // Opener race. Consider finding a way to shoehorn this up into the Opener.
    // It is synchronous and it is in any case invoked as part of the Connector
    // open/close loop/queue so the `_maybeClose` so there are two ways in which
    // it is protected against an Opener race.

    //
    _checkVersion ({ request, version }) {
        request.readyState = 'done'
        if (version == null || this._opener.memento.version == version) {
            dispatchEvent(null, request, Event.createImpl(this._factory._globalObject, [ 'success' ], {}))
        } else {
            const db = webidl.implForWrapper(request.result)
            db._closing = true
            request._error = DOMException.create(this._factory._globalObject, [ 'TODO: message', 'VersionError' ], {})
            this._opener._maybeClose(db)
            request.result = null
            dispatchEvent(null, request, Event.createImpl(this._factory._globalObject, [ 'error' ], {}))
        }
    }

    // This may appear to be a job for Turnstile, or maybe Avenue, but the
    // details of shutdown are so fiddly it is easier to implement as a for loop
    // with a sleeping future. When the Connector's Opener is destroyed, the
    // Connector can break from this loop and then destroy itself.

    // Connector creation race is resolved by deleting the connector from the
    // IDBFactory's map immediately upon exiting the connect loop so that the
    // factory open or delete methods will see the empty slot in the map and
    // create a new connector. The breaking from the loop and deleting side and
    // checking the map side are both synchronous.

    //
    async _connect (schema) {
        await new Promise(resolve => setImmediate(resolve))
        for (;;) {
            // **TODO** Seeing a log of Lists gathering in _isolation.panic in
            // Destructible.
            if (this._events.length == 0) {
                if (this._opener.destructible.destroyed) {
                    break
                }
                this._sleep = new Future
                await this._sleep.promise
                continue
            }
            const event = this._events.shift()
            switch (event.method) {
            case 'open': {
                    if (this._opener.destructible.destroyed || (event.version != null && this._opener.memento.version < event.version)) {
                        if (! this._opener.destructible.destroyed) {
                            await this._opener.close(event)
                        }
                        this._version = event.version || 1
                        await this._opener.destructible.promise.catch(noop)
                        this._opener = await Opener.open(this.destructible.ephemeral('opener'), this, new Schema(schema), event)
                        this._opener.destructible.promise.then(() => this._sleep.resolve())
                        // **TODO** Spaghetti.
                        if (this._opener.memento != null) {
                            this._checkVersion(event)
                        }
                    } else {
                        this._opener.connect(new Schema(schema), event)
                        this._checkVersion(event)
                    }
                }
                break
            case 'delete': {
                    const { request } = event
                    if (! this._opener.destructible.destroyed) {
                        await this._opener.close(this._factory._globalObject, event)
                    }
                    await rmrf(process.version, fs, path.join(this._factory._directory, this._name))
                    const id = schema.name[this._name]
                    if (id != null) {
                        delete schema.store[id]
                        delete schema.extractor[id]
                        delete schema.name[this._name]
                    }
                    request.source = null
                    delete request.result
                    request.readyState = 'done'
                    dispatchEvent(null, event.request, IDBVersionChangeEvent.createImpl(this._factory._globalObject, [ 'success', {
                        oldVersion: this._version, newVersion: null
                    } ], {}))
                }
                break
            }
        }
        delete this._factory._connectors[this._name]
        this.destructible.destroy()
    }
}

class IDBFactoryImpl {
    constructor (globalObject, args, { destructible, directory }) {
        this._globalObject = globalObject

        this.destructible = destructible

        this.deferrable = this.destructible.durable($ => $(), { countdown: 1 }, 'deferrable')

        this.destructible.destruct(() => this.deferrable.decrement())

        this._directory = directory

        // "Let queue be the connection queue for origin and name." We have a
        // single queue for all connections so that the requirement that open,
        // close and delete are processed in order or an origin and name is
        // maintained, but the operations for different origin and name pairs do
        // not occur in parallel.

        this._connectors = {}

        this._turnstile = new Turnstile(this.deferrable.durable('turnstile'))

        this.cmp = function (left, right) { return comparator(globalObject, left, right) }
    }

    // IDBFactory.

    // The only entry point. We map it to a Connector which we create if it does
    // not exist. The Connector manages connection loop. The connection loop
    // will open or delete a database. Opening is done with an Opener that
    // manages one or more connections to an underlying Memento store.

    // Since this is the only entry, we are going to have it perform a double
    // duty of starting our background processes by launching a nested factory
    // implementation.

    // **TODO** When the version is missing we open with the current version or
    // 1 if it does not exist.

    _vivify (name) {
        if (!(name in this._connectors)) {
            this._connectors[name] = new Connector(this.deferrable.ephemeral($ => $(), `indexeddb.${name}`), this, name)
        }
        return this._connectors[name]
    }

    open (name, version) {
        if (version === undefined) {
            version = null
        } else {
            if (
                typeof version != 'number' ||
                isNaN(version) ||
                version < 1 ||
                version > Number.MAX_SAFE_INTEGER
            ) {
                throw new TypeError
            } else {
                version = Math.floor(version)
            }
        }
        const request = IDBOpenDBRequest.createImpl(this._globalObject)
        this._vivify(name).push({ method: 'open', request, version })
        return request
    }

    deleteDatabase (name) {
        const request = IDBOpenDBRequest.createImpl(this._globalObject)
        this._vivify(name).push({ method: 'delete', request })
        return request
    }
}

module.exports = { implementation: IDBFactoryImpl }

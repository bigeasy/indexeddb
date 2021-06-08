const assert = require('assert')

const fs = require('fs').promises
const path = require('path')

const rmrf = require('./rmrf')

const rescue = require('rescue')

const Schema = require('./schema')

const { extractify } = require('./extractor')

const { Future } = require('perhaps')
const { Queue } = require('avenue')
const Destructible = require('destructible')
const Memento = require('memento')

const comparator = require('./compare')

const Transactor = require('./transactor')

const Turnstile = require('turnstile')

const EventTarget = require('./living/generated/EventTarget')
const Event = require('./living/generated/Event')
const IDBRequest = require('./living/generated/IDBRequest')
const IDBOpenDBRequest = require('./living/generated/IDBOpenDBRequest')
const IDBVersionChangeEvent = require('./living/generated/IDBVersionChangeEvent')
const IDBDatabase = require('./living/generated/IDBDatabase')
const IDBTransaction = require('./living/generated/IDBTransaction')
const DOMException = require('domexception/lib/DOMException')

const { createEventAccessor } = require('./living/helpers/create-event-accessor')
const { dispatchEvent } = require('./dispatch')

const webidl = require('./living/generated/utils')

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
    constructor (destructible, schema, directory, name, previous) {
        this.destructible = destructible
        this.directory = directory
        this.name = name
        this._transactor = new Transactor
        this.destructible.durable('transactions', this._transact(schema))
        this.opening = null
        this._handles = []
    }

    async close (globalObject, event) {
        for (const connection of this._handles) {
            if (! connection._closing) {
                dispatchEvent(null, connection, Event.createImpl(globalObject, [ 'versionchange' ], {}))
            }
        }
        // **TODO** No, it's a closing flag you're looking for.
        if (this._handles.some(connection => ! connection._closing)) {
            dispatchEvent(null, connection, Event.createImpl(globalObject, [ 'blocked' ], {}))
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
    async _transact (schema) {
        let count = 0
        for await (const event of this._transactor.queue.shifter()) {
            switch (event.method) {
            case 'transact': {
                    const { names, extra: { db, transaction } } = event
                    this.destructible.ephemeral(`transaction.${count++}`, async () => {
                        // **TODO** How is this mutating????
                        if (transaction.mode == 'readonly') {
                            await this.memento.snapshot(snapshot => transaction._run(snapshot, schema, names))
                        } else {
                            await this.memento.mutator(mutator => transaction._run(mutator, schema, names))
                        }
                        db._transactions.delete(transaction)
                        this._maybeClose(db)
                        this._transactor.complete(names)
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
    connect (globalObject, schema, name, { request }) {
        const db = IDBDatabase.createImpl(globalObject, [], {
            name,
            schema: new Schema(schema),
            transactor: this._transactor,
            version: this._version
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
    static async open (globalObject, comparator, destructible, root, directory, name, version, { request }) {
        // **TODO** `version` should be a read-only property of the
        // Memento object.
        const opener = new Opener(destructible, root, directory, name)
        await fs.mkdir(path.join(directory, name), { recursive: true })
        const paired = new Queue().shifter().paired
        const schema = new Schema(root)
        opener._version = version
        const db = IDBDatabase.createImpl(globalObject, [], { name, schema, transactor: opener._transactor })
        request.result = webidl.wrapperForImpl(db)
        opener._handles.push(db)
        let current, transaction
        try {
            let upgraded = false
            opener.memento = await Memento.open({
                destructible: destructible.durable('memento'),
                turnstile: this._turnstile,
                version: version,
                directory: path.join(directory, name),
                comparators: { indexeddb: comparator }
            }, async upgrade => {
                current = upgrade.version.current
                db.version = upgrade.version.target
                if (upgrade.version.current == 0) {
                    await upgrade.store('schema', { 'id': Number })
                }
                const max = (await upgrade.cursor('schema').array()).pop()
                schema.max = max ? max.id + 1 : 0
                // **TODO** Really need to do a join.
                for await (const items of upgrade.cursor('schema').iterator()) {
                    for (const item of items) {
                        root.store[item.id] = item
                        root.name[item.name] = item.id
                        if (item.keyPath != null) {
                            root.extractor[item.id] = extractify(item.keyPath)
                        }
                    }
                }
                schema.reset()
                const paired = new Queue().shifter().paired
                request.readyState = 'done'
                transaction = IDBTransaction.createImpl(globalObject, [], { schema, database: db, mode: 'versionchange', previousVersion: upgrade.version.current })
                request.transaction = webidl.wrapperForImpl(transaction)
                db._transaction = transaction
                db._transactions.add(transaction)
                request.error = null
                const vce = IDBVersionChangeEvent.createImpl(globalObject, [ 'upgradeneeded', { newVersion: upgrade.version.target, oldVersion: upgrade.version.current } ], {})
                dispatchEvent(transaction, request, vce)
                await transaction._run(upgrade, [])
                // **TODO** What to do if the database is closed before we can
                // indicate success?
                db._transactions.delete(transaction)
                db._transaction = null
                // **TODO** This creates a race. If we close as the last action and
                // then sleep or something then our transact queue will close and we
                // will call maybe close with an already closed db.
                upgraded = true
                debugger
            })
                debugger
            if (! upgraded) {
                await opener.memento.snapshot(async snapshot => {
                    for await (const items of snapshot.cursor('schema').iterator()) {
                        for (const item of items) {
                            root.store[item.id] = item
                            root.name[item.name] = item.id
                            if (item.keyPath != null) {
                                root.extractor[item.id] = extractify(item.keyPath)
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
            db._transactions.delete(transaction)
            db._version = current
            db._closing = true
            opener._maybeClose(db)
            request.result = undefined
            request.transaction = null
            request.error = DOMException.create(globalObject, [ 'TODO: message', 'AbortError' ], {})
            dispatchEvent(null, request, Event.createImpl(globalObject, [ 'error', { bubbles: true, cancelable: true } ], {}))
            opener._transactor.queue.push({ method: 'close', extra: { db } })
            return { destructible: new Destructible('errored').destroy() }
        }
    }
}

class Connector {
    constructor (factory, name) {
        const schema = { name: {}, store: {}, max: 0, index: {}, extractor: {} }
        this._opener = { destructible: new Destructible('opener').destroy() }
        this.destructible = factory.deferrable.ephemeral($ => $(), `indexeddb.${name}`)
        this._comparator = factory.cmp
        this._globalObject = factory._globalObject
        factory.deferrable.increment()
        this.destructible.destruct(() => factory.deferrable.decrement())
        this._directory = factory._directory
        this._name = name
        this._map = factory._connectors
        this._events = []
        this._sleep = Future.resolve()
        this.destructible.durable('connections', this._connect(schema))
    }

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
        if (version == null || this._opener.memento.version == version) {
            request.error = null
            dispatchEvent(null, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
        } else {
            const db = webidl.implForWrapper(request.result)
            db._closing = true
            request.error = DOMException.create(this._globalObject, [ 'TODO: message', 'VersionError' ], {})
            this._opener._maybeClose(db)
            request.result = null
            dispatchEvent(null, request, Event.createImpl(this._globalObject, [ 'error' ], {}))
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
                            await this._opener.close(this._globalObject, event)
                        }
                        this._version = event.version || 1
                        this._opener = await Opener.open(this._globalObject, this._comparator, this.destructible.ephemeral('opener'), schema, this._directory, this._name, this._version, event)
                        this._opener.destructible.promise.then(() => this._sleep.resolve())
                        // **TODO** Spaghetti.
                        if (this._opener.memento != null) {
                            this._checkVersion(event)
                        }
                    } else {
                        this._opener.connect(this._globalObject, schema, this._name, event)
                        this._checkVersion(event)
                    }
                }
                break
            case 'delete': {
                    const { request } = event
                    if (! this._opener.destructible.destroyed) {
                        await this._opener.close(this._globalObject, event)
                    }
                    await rmrf(process.version, fs, path.join(this._directory, this._name))
                    const id = schema.name[this._name]
                    if (id != null) {
                        delete schema.store[id]
                        delete schema.extractor[id]
                        delete schema.name[this._name]
                    }
                    request.source = null
                    request.error = null
                    delete request.result
                    request.readyState = 'done'
                    dispatchEvent(null, event.request, IDBVersionChangeEvent.createImpl(this._globalObject, [ 'success', { oldVersion: this._version, newVersion: null } ], {}))
                }
                break
            }
        }
        delete this._map[this._name]
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

        // The single connection queue for all origin and name pairs.
        this._queue = new Queue

        // Initialize the set of databases.
        this._queue.push({ method: 'initialize' })

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
            this._connectors[name] = new Connector(this, name)
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

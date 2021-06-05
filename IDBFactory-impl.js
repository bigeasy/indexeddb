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

const { createEventAccessor } = require('./living/helpers/create-event-accessor')
const { dispatchEvent } = require('./dispatch')

const { VersionError, AbortError } = require('./error')

const webidl = require('./living/generated/utils')

// An interim attempt to bridge the W3C Event based interface of IndexedDB with
// the `async`/`await` interface of Memento. Assuming that eventually this works
// reliably with no errors eminating from Memento, we do not want to impose a
// promise resolution on the casual user. When a database shuts down in
// IndexedDB, when all transactions on all connections complete, we want to
// close the underlying Memento database. We do not want the user to have to
// explicitly invoke `Destructible.destroy()` to cancel the queues.

// Ideally we find a path for all errors to exit through the IndexedDB
// interface, and ideally those errors are only related to environmental issues;
// full disks or exhusted memory. We will always have a reporting mechanism
// available to get the more detailed Memento error. The IndexedDB specification
// provides a specific set of errors for reporting. Those errors to not allow
// for more detailed reporting, there is no way to attach a nested error or the
// like.

// To get this ability to wind down we use a single root Destructible. You can
// await on its Promise, or register a catch handler, to get the Interrupt
// exception. The destructible will be a property of our IDBFactory
// implementation. IDBFactory is an interface, after all, so our implementation
// can have its own properties in addition.

// Within we'll have a Database class that maintains the Memento database,
// counts the connections and the transactions per connection.

//
class Opener {
    constructor (destructible, schema, directory, name, previous) {
        this.destructible = destructible
        this.directory = directory
        this.name = name
        this._instance = Opener.count++
        this._transactor = new Transactor
        this.destructible.durable('transactions', this._transact(schema))
        this.opening = null
        this._handles = []
    }

    async close (event) {
        for (const connection of this._handles) {
            if (! connection._closing) {
                dispatchEvent(null, connection, new Event('versionchange'))
            }
        }
        // **TODO** No, it's a closing flag you're looking for.
        for (const db of this._handles) {
            console.log('>', db._closing)
        }
        if (this._handles.some(connection => ! connection._closing)) {
            dispatchEvent(null, event.request, new Event('blocked'))
        }
        for (const connection of this._handles) {
            await connection._closed.promise
        }
    }

    _maybeClose (db) {
        console.log(db._closing, db._transactions.size)
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

    static count = 0

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
                        console.log(db._transactions.size)
                        db._transactions.delete(transaction)
                        console.log(db._transactions.size)
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

    connect (schema, name, { request }) {
        console.log('--- CONNECT EXISTING ---')
        const db = request.result = new DBDatabase(name, new Schema(schema), this._transactor, this._version)
        this._handles.push(db)
    }

    static async open (globalObject, destructible, root, directory, name, version, { request }) {
        console.log('--- OPEN EXISTING ---', root)
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
                console.log('-?-', this._globalObject)
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
            })
            if (! upgraded) {
                await opener.memento.snapshot(async snapshot => {
                    for await (const items of snapshot.cursor('schema').iterator()) {
                        for (const item of items) {
                            console.log('>>>>', item)
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
            request.error = new AbortError
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

    _checkVersion ({ request, version }) {
        if (version == null || this._opener.memento.version == version) {
            request.error = null
            dispatchEvent(null, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
        } else {
            request.result._closing = true
            request.error = new VersionError
            this._opener._maybeClose(request.result)
            request.result = null
            dispatchEvent(null, request, new Event('error'))
        }
    }

    // Looks like a job for Turnstile, but I don't seem to be able to bring
    // myself to get Turnstile up and running for this one. The spec implies
    // that these loops should run in parallel for a database. I had them all in
    // one loop but I don't want to encounter problems with deadlock that I
    // cannot foresee and will never encouter myself.

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
                        this._opener = await Opener.open(this._globalObject, this.destructible.ephemeral('opener'), schema, this._directory, this._name, this._version, event)
                        this._opener.destructible.promise.then(() => this._sleep.resolve())
                        // **TODO** Spaghetti.
                        if (this._opener.memento != null) {
                            this._checkVersion(event)
                        }
                    } else {
                        this._opener.connect(schema, this._name, event)
                        this._checkVersion(event)
                    }
                }
                break
            case 'delete': {
                    if (! this._opener.destructible.destroyed) {
                        await this._opener.close(event)
                    }
                    await rmrf(process.version, fs, path.join(this._directory, this._name))
                    const id = schema.name[this._name]
                    if (id != null) {
                        delete schema.store[id]
                        delete schema.extractor[id]
                        delete schema.name[this._name]
                    }
                    event.request.source = null
                    event.request.error = null
                    event.request.readyState = 'done'
                    console.log('i am here')
                    // dispatchEvent(null, event.request, new DBVersionChangeEvent('success', { oldVersion: this._version }))
                    console.log('i am there')
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
    }

    // IDBFactory.

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
        return webidl.wrapperForImpl(request)
    }

    deleteDatabase (name) {
        const request = IDBOpenDBRequest.createImpl(this._globalObject)
        this._vivify(name).push({ method: 'delete', request })
        return webidl.wrapperForImpl(request)
    }

    cmp = comparator
}

module.exports = { implementation: IDBFactoryImpl }

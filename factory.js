const assert = require('assert')

const fs = require('fs').promises
const path = require('path')

const rmrf = require('./rmrf')

const rescue = require('rescue')

const { Future } = require('perhaps')
const { Queue } = require('avenue')
const Destructible = require('destructible')
const Memento = require('memento')

const comparator = require('./compare')

const Transactor = require('./transactor')

const Turnstile = require('turnstile')

const { DBTransaction } = require('./transaction')
const { DBOpenDBRequest } = require('./request')
const { DBDatabase } = require('./database')

const { Event } = require('event-target-shim')
const { dispatchEvent } = require('./dispatch')

const Loop = require('./loop')

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
        this._transactor = new Transactor
        this.destructible.durable('transactions', this._transact(schema))
        this.opening = null
        this._handles = []
    }

    async close (event) {
        for (const connection of this._handles) {
            console.log(connection._closing)
            if (! connection._closing) {
                dispatchEvent(connection.request, new Event('versionchange'))
            }
        }
        // **TODO** No, it's a closing flag you're looking for.
        if (this._handles.some(connection => ! connection._closing)) {
            dispatchEvent(event.request, new Event('blocked'))
        }
        for (const connection of this._handles) {
            await connection._closed.promise
        }
    }

    _maybeClose (db) {
        if (db._closing && db._transactions.size == 0) {
            const index = this._handles.indexOf(db)
            assert(index != -1)
            this._handles.splice(index, 1)
            db._closed.resolve()
            console.log(this._handles.length, db._closing, db._transactions.size)
            if (this._handles.length == 0) {
                console.log('YES CLOSE')
                this.destructible.destroy()
                this._transactor.queue.push(null)
            }
        }
    }

    async _transact (schema) {
        let count = 0
        for await (const event of this._transactor.queue.shifter()) {
            switch (event.method) {
            case 'transact': {
                    const { names, extra: { loop, db, transaction } } = event
                    this.destructible.ephemeral(`transaction.${count++}`, async () => {
                        // **TODO** How is this mutating????
                        await this._memento.snapshot(snapshot => loop.run(snapshot, schema, names))
                        db._transactions.delete(transaction)
                        this._maybeClose(db)
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

    static async open (destructible, schema, directory, name, { request }) {
        const opening = new Opener(destructible, schema, directory, name)
        // **TODO** `version` should be a read-only property of the
        // Memento object.
        await opening.destructible.ephemeral($ => $(), 'upgrade', async () => {
            try {
                await fs.mkdir(path.join(directory, name), { recurse: true })
                const paired = new Queue().shifter().paired
                const connections = new Map
                const loop = new Loop(schema)
                const db = request.result = new DBDatabase(name, schema, opening._transactor, loop, 'versionupgrade')
                opening._memento = await Memento.open({
                    destructible: destructible.durable('memento'),
                    turnstile: this._turnstile,
                    directory: path.join(directory, name),
                    comparators: { indexeddb: comparator }
                }, async upgrade => {
                    if (upgrade.version.current == 0) {
                        await upgrade.store('schema', { 'id': Number })
                    }
                    const max = (await upgrade.cursor('schema').array()).pop()
                    schema.max = max ? max.id : 0
                    const paired = new Queue().shifter().paired
                    request.readyState = 'done'
                    request.transaction = new DBTransaction(schema, null, loop, 'versionupgrade')
                    db._transactions.add(request.transaction)
                    opening._handles.push(db)
                    connections.set(db, new Set)
                    request.transaction._database = db
                    connections.get(db).add(db._transaction = request.transaction)
                    dispatchEvent(request, new Event('upgradeneeded'))
                    await loop.run(upgrade, schema, [])
                })
                db._transactions.delete(request.transaction)
                opening._maybeClose(db)
                request.readyState = 'done'
                dispatchEvent(request, new Event('success'))
            } catch (error) {
                console.log(error.stack)
                rescue(error, [{ symbol: Memento.Error.ROLLBACK }])
            }
        }).promise.catch(error => console.log(error.stack))
        return opening
    }
}

class Connector {
    constructor (destructible, directory, name, map) {
        const schema = { name: {}, store: {}, max: 0, index: {}, extractor: {} }
        this._opener = { destructible: new Destructible('opener').destroy() }
        this._destructible = destructible
        this._directory = directory
        this._name = name
        this._map = map
        this._events = []
        this._sleep = Future.resolve()
        this._destructible.durable('connections', this._connect(schema))
    }

    push (event) {
        this._events.push(event)
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
            console.log(this._events, this._opener.destructible.destroyed)
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
                    if (this._opener.destructible.destroyed || this._opener.version < event.version) {
                        if (! this._opener.destructible.destroyed) {
                            await this._opener.close(event)
                        }
                        this._opener = await Opener.open(this._destructible.ephemeral('opener'), schema, this._directory, this._name, event)
                        this._opener.destructible.promise.then(() => {
                            this._sleep.resolve()
                            console.log('DID RESOLVE !!!!!')
                        })
                    } else {
                        this._opener.connect(event)
                    }
                }
                break
            case 'delete': {
                    if (! this._opener.destructible.destroyed) {
                        console.log('will close')
                        await this._opener.close(event)
                    }
                    await rmrf(process.version, fs, path.join(this._directory, this._name))
                    event.request.source = null
                    dispatchEvent(event.request, new Event('success'))
                }
                break
            }
        }
        console.log('I AM LEAVING')
        delete this._map[this._name]
        this._destructible.destroy()
    }
}

class DBFactory {
    constructor ({ directory }) {
        this.destructible = new Destructible(`indexeddb: ${directory}`)

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

        this._turnstile = new Turnstile(this.destructible.durable('turnstile'))
    }

    // IDBFactory.

    // Since this is the only entry, we are going to have it perform a double
    // duty of starting our background processes by launching a nested factory
    // implementation.

    // **TODO** When the version is missing we open with the current version or
    // 1 if it does not exist.

    _vivify (name) {
        if (!(name in this._connectors)) {
            this._connectors[name] = new Connector(this.destructible.ephemeral(`indexeddb.${name}`), this._directory, name, new Destructible('previous').destroy(), this._connectors)
        }
        return this._connectors[name]
    }

    open (name, version = null) {
        const request = new DBOpenDBRequest()
        this._vivify(name).push({ method: 'open', request, version })
        return request
    }

    // **TODO** Implement `IDBFactory.deleteDatabase()`.
    deleteDatabase (name) {
        const request = new DBOpenDBRequest()
        this._vivify(name).push({ method: 'delete', request })
        return request
    }

    // **TODO** Put the compare function here.
    cmp = comparator
}

exports.DBFactory = DBFactory

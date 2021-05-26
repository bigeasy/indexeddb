const assert = require('assert')

const fs = require('fs').promises
const path = require('path')

const rescue = require('rescue')

const { Future } = require('perhaps')
const { Queue } = require('avenue')
const Destructible = require('destructible')
const Memento = require('memento')

const comparator = require('./compare')

const Transactor = require('./transactor')

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
    constructor (destructible, directory, name, previous) {
        this.destructible = destructible
        this.directory = directory
        this.name = name
        this.connections = []
        const schema = { name: {}, store: {}, max: 0, index: {}, extractor: {} }
        const transactor = new Transactor
        this._sleep = Future.resolve()
        this.connections.push({ method: 'initialize', previous })
        this.destructible.durable('connections', this._connect(schema, transactor))
        this.destructible.durable('transactions', this._transact(schema, transactor))
        this.opening = null
        this._handles = []
    }

    async _waitForClose () {
        for (const connection of this._handles) {
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

    _maybeClose (transactor, db) {
        if (db._closing && db._transactions.size == 0) {
            const index = this._handles.indexOf(db)
            assert(index != -1)
            this._handles.splice(index, 1)
            db._closed.resolve()
            console.log(this._handles.length, this.connections)
            if (this._handles.length == 0 && this.connections.length == 0) {
                this.destructible.destroy()
                transactor.queue.push(null)
                this._sleep.resolve()
            }
        }
    }

    async _transact (schema, transactor) {
        let count = 0
        for await (const event of transactor.queue.shifter()) {
            switch (event.method) {
            case 'transact': {
                    const { names, extra: { loop, db, transaction } } = event
                    this.destructible.ephemeral(`transaction.${count++}`, async () => {
                        // **TODO** How is this mutating????
                        await this.opening.memento.snapshot(snapshot => loop.run(snapshot, schema, names))
                        db._transactions.delete(transaction)
                        this._maybeClose(transactor, db)
                    })
                }
            case 'close': {
                    const { extra: { db } } = event
                    this._maybeClose(transactor, db)
                }
                break
            }
        }
    }

    // Looks like a job for Turnstile, but I don't seem to be able to bring
    // myself to get Turnstile up and running for this one. The spec implies
    // that these loops should run in parallel for a database. I had them all in
    // one loop but I don't want to encounter problems with deadlock that I
    // cannot foresee and will never encouter myself.

    //
    async _connect (schema, transactor) {
        console.log('--- starting ---')
        for (;;) {
            console.log('???', this.destructible.destroyed, this.connections)
            // **TODO** Seeing a log of Lists gathering in _isolation.panic in
            // Destructible.
            if (this.connections.length == 0) {
                if (this.destructible.destroyed) {
                    break
                }
                this._sleep = new Future
                await this._sleep.promise
                continue
            }
            const event = this.connections.shift()
            switch (event.method) {
            case 'initialize': {
                    await event.previous.promise
                }
                break
            case 'open': {
                    if (this.opening == null || this.opening.version < event.version) {
                        if (this.opening != null) {
                            await this._waitForClose()
                        }
                        // **TODO** `version` should be a read-only property of the
                        // Memento object.
                        await this.destructible.ephemeral($ => $(), 'upgrade', async () => {
                            try {
                                const directory = path.join(this.directory, event.name)
                                await fs.mkdir(directory, { recurse: true })
                                const paired = new Queue().shifter().paired
                                const connections = new Map
                                const memento = await Memento.open({
                                    destructible: this.destructible.durable('memento'),
                                    turnstile: this._turnstile,
                                    directory: directory,
                                    comparators: { indexeddb: comparator }
                                }, async upgrade => {
                                    if (upgrade.version.current == 0) {
                                        await upgrade.store('schema', { 'id': Number })
                                    }
                                    const max = (await upgrade.cursor('schema').array()).pop()
                                    schema.max = max ? max.id : 0
                                    const paired = new Queue().shifter().paired
                                    event.request.readyState = 'done'
                                    const loop = new Loop(schema)
                                    event.request.transaction = new DBTransaction(schema, null, loop, 'versionupgrade')
                                    const db = event.request.result = new DBDatabase(event.name, schema, transactor, loop, 'versionupgrade')
                                    this._handles.push(db)
                                    connections.set(db, new Set)
                                    event.request.transaction._database = db
                                    connections.get(db).add(db._transaction = event.request.transaction)
                                    dispatchEvent(event.request, new Event('upgradeneeded'))
                                    event.upgraded = true
                                    await loop.run(upgrade, schema, [])
                                })
                                this.opening = { memento, transactor, queue: paired.queue, connections }
                                // **TODO** This looks all wrong.
                                if (! event.upgraded) {
                                    loop.terminated = true
                                    event.request.readyState = 'done'
                                    event.request.result = new DBDatabase(database, queues)
                                }
                                dispatchEvent(event.request, new Event('success'))
                            } catch (error) {
                                console.log(error.stack)
                                rescue(error, [{ symbol: Memento.Error.ROLLBACK }])
                            }
                        }).promise.catch(error => console.log(error.stack))
                    }
                }
                break
            case 'delete': {
                    if (this.opening != null) {
                        console.log('--- would wait for close ---')
                    }
                    console.log('--- DELETING ---')
                }
                break
            }
        }
        console.log('--- stopping ---')
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

        this._databases = {}
    }

    // IDBFactory.

    // Since this is the only entry, we are going to have it perform a double
    // duty of starting our background processes by launching a nested factory
    // implementation.

    // **TODO** When the version is missing we open with the current version or
    // 1 if it does not exist.

    _vivify (name) {
        if (!(name in this._databases)) {
            this._databases[name] = new Opener(this.destructible.ephemeral(`indexeddb.${name}`), this._directory, name, new Destructible('previous').destroy())
        } else if (this._databases[name].destructible.destroyed) {
            this._databases[name] = new Opener(this.destructible.ephemeral(`indexeddb.${name}`), this._directory, name, this._databases[name].destructible)
        }
    }

    open (name, version = null) {
        this._vivify(name)
        const request = new DBOpenDBRequest()
        this._databases[name].connections.push({ method: 'open', request, name, version })
        this._databases[name]._sleep.resolve()
        return request
    }

    // **TODO** Implement `IDBFactory.deleteDatabase()`.
    deleteDatabase (name) {
        this._vivify(name)
        const request = new DBOpenDBRequest()
        this._databases[name].connections.push({ method: 'delete', request: request, name })
        this._databases[name]._sleep.resolve()
        return request
    }

    // **TODO** Put the compare function here.
    cmp = comparator
}

exports.DBFactory = DBFactory

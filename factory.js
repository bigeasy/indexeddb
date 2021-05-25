const assert = require('assert')

const fs = require('fs').promises
const path = require('path')

const rescue = require('rescue')

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

class DBFactory {
    constructor ({ directory }) {
        this._destructible = new Destructible(`indexeddb: ${directory}`)
        this._directory = directory

        // "Let queue be the connection queue for origin and name." We have a
        // single queue for all connections so that the requirement that open,
        // close and delete are processed in order or an origin and name is
        // maintained, but the operations for different origin and name pairs do
        // not occur in parallel.

        // The single connection queue for all origin and name pairs.
        this._queue = new Queue

        // The queue processing function.
        this._destructible.durable($ => $(), 'factory', this._outer(this._queue.shifter()))

        this._destructible.promise.catch(error => console.log(error.stack))

        // Initialize the set of databases.
        this._queue.push({ method: 'initialize' })

        this._databases = {}

        this._queues = {}
    }

    async _waitForClose (database) {
        for (const connection of database.opening.connections) {
            if (! connection.closing) {
                dispatchEvent(connection.request, new Event('versionchange'))
            }
        }
        if (database.opening.connections.size() != 0) {
            dispatchEvent(event.request, new Event('blocked'))
        }
        for (const connection of database.opening.connections) {
            await connection.closed.promise
        }
    }

    // Looks like a job for Turnstile, but I don't seem to be able to bring
    // myself to get Turnstile up and running for this one. The spec implies
    // that these loops should run in parallel for a database. I had them all in
    // one loop but I don't want to encounter problems with deadlock that I
    // cannot foresee and will never encouter myself.

    //
    async _inner (database, shifter) {
        const dbs = []
        for await (const event of shifter) {
            switch (event.method) {
            case 'open': {
                    if (database.opening == null || database.opening.version < event.version) {
                        if (database.opening != null) {
                            await this._waitForClose(database)
                        }
                        // **TODO** `version` should be a read-only property of the
                        // Memento object.
                        const transactor = new Transactor
                        const transactions = transactor.queue.shifter()
                        const schema = { name: {}, store: {}, max: 0, index: {}, extractor: {} }
                        await database.destructible.ephemeral($ => $(), 'upgrade', async () => {
                            try {
                                const directory = path.join(this._directory, event.name)
                                await fs.mkdir(directory, { recurse: true })
                                const paired = new Queue().shifter().paired
                                const connections = new Map
                                const memento = await Memento.open({
                                    destructible: database.destructible.durable('memento'),
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
                                    dbs.push(db)
                                    connections.set(db, new Set)
                                    event.request.transaction._database = db
                                    connections.get(db).add(db._transaction = event.request.transaction)
                                    dispatchEvent(event.request, new Event('upgradeneeded'))
                                    event.upgraded = true
                                    await loop.run(upgrade, schema, [])
                                })
                                database.opening = { memento, transactor, queue: paired.queue, connections }
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
                        database.destructible.durable($ => $(), 'transactions', async () => {
                            let count = 0
                            for await (const event of transactions) {
                                const { names, extra: { loop, db, transaction } } = event
                                database.destructible.ephemeral(`transaction.${count++}`, async () => {
                                    // **TODO** How is this mutating????
                                    await database.opening.memento.snapshot(snapshot => loop.run(snapshot, schema, names))
                                    db._transactions.delete(transaction)
                                    if (db._closing && db._transactions.size == 0) {
                                        const index = dbs.indexOf(db)
                                        assert(index != -1)
                                        dbs.splice(index, 1)
                                        console.log('why yes, I am closing, why do you ask?')
                                        db._closed.resolve()
                                    }
                                })
                            }
                            await database.opening.memento.close()
                            database.destructible.destroy()
                            database.queue.push(null)
                        })
                    }
                }
                break
            case 'delete': {
                }
                break
            }
        }
    }

    async _spawn (name) {
        const queue = new Queue
        const database = this._databases[name] = {
            opening: null,
            queue: queue,
            destructible: this._destructible.ephemeral($ => $(), `database.${name}`)
        }
        database.destructible.durable($ => $(), 'connections', this._inner(database, queue.shifter()))
    }

    async _outer (shifter) {
        for await (const event of shifter) {
            switch (event.method) {
            case 'initialize': {
                    const dir = await fs.readdir(this._directory)
                    for (const file of dir) {
                        try {
                            await fs.stat(path.join(this._directory, file, 'version.json'))
                            this._spawn(file)
                        } catch (error) {
                            rescue(error, [{ code: 'ENOENT' }])
                        }
                    }
                }
                break
            case 'open': {
                    if (this._databases[event.name] == null) {
                        this._spawn(event.name)
                    }
                    this._databases[event.name].queue.push(event)
                    const database = this._databases[event.name]
                }
                break
            case 'delete': {
                    const database = this._databases[event.name]
                    if (database == null) {
                        dispatchEvent(event.request, new Event('success'))
                    } else {
                    }
                }
                break
            }
        }
    }

    // IDBFactory.

    // **TODO** When the version is missing we open with the current version or
    // 1 if it does not exist.

    open (name, version = null) {
        const request = new DBOpenDBRequest()
        this._queue.push({ method: 'open', request: request, name, version })
        return request
    }

    // **TODO** Implement `IDBFactory.deleteDatabase()`.
    deleteDatabase (name) {
        const request = new DBOpenDBRequest()
        this._queue.push({ method: 'delete', request: request, name })
        return request
    }

    // **TODO** Put the compare function here.
    cmp = comparator
}

exports.DBFactory = DBFactory

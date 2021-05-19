const assert = require('assert')

const fs = require('fs').promises
const path = require('path')

const rescue = require('rescue')

const Transactor = require('./transactor')

const { DBOpenDBRequest } = require('./request')
const { DBDatabase } = require('./database')

const comparator = require('./compare')

const { Queue } = require('avenue')
const Future = require('perhaps')
const Destructible = require('destructible')
const Memento = require('memento')

const { Event } = require('event-target-shim')
const { dispatchEvent } = require('./dispatch')

const Loop = require('./loop')

class DBFactory {
    constructor ({ directory }) {
        this._destructible = new Destructible(`indexeddb: ${directory}`)
        this._directory = directory
        this._queue = new Queue
        this._destructible.durable($ => $(), 'factory', this._factory(this._queue.shifter()))
        this._memento = null
        this._databases = {}
        this._queues = {}
    }

    async _request ({ body }) {
        const operations = this._queue.get(body)
        while (operations.length != 0) {
            await operations.shift()()
        }
        this._queue.delete(body)
    }

    _transaction (mode) {
        return transaction => {
        }
    }

    async _database (destructible, shifter) {
        const handle = {
            opened: false
        }
        for await (const entry of shifter) {
            switch (entry.method) {
            case 'open': {
                }
                break
            case 'transaction': {
                }
                break
            }
        }
    }

    async _dispatch (event) {
        switch (event.method) {
        case 'open': {
                // **TODO** Assert that it does not already exist.
                const destructible = this._destructible.ephemeral($ => $(), `database.${event.name}`)
                const queues = {
                    transactions: new Queue().shifter().paired,
                    schema: null
                }
                this._queues[event.name] = queues
                destructible.ephemeral($ => $(), 'connections', async () => {
                    try {
                        const schema = { store: {} }
                        const directory = path.join(this._directory, event.name)
                        await fs.mkdir(directory, { recurse: true })
                        const transactor = new Transactor
                        const transactions = transactor.queue.shifter()
                        const paired = new Queue().shifter().paired
                        const memento = await Memento.open({
                            destructible: destructible.durable('memento'),
                            turnstile: this._turnstile,
                            directory: directory,
                            comparators: { indexeddb: comparator }
                        }, async upgrade => {
                            if (upgrade.version.current == 0) {
                                await upgrade.store('schema', { 'name': String })
                            }
                            for await (const properties of upgrade.cursor('schema').iterator()) {
                            }
                            const paired = new Queue().shifter().paired
                            event.request.readyState = 'done'
                            const loop = new Loop(schema)
                            const database = event.request.result = new DBDatabase(schema, transactor, loop, 'versionupgrade')
                            dispatchEvent(event.request, new Event('upgradeneeded'))
                            event.upgraded = true
                            await loop.run(upgrade, schema, [])
                        })
                        this._databases[event.name] = { destructible, memento, transactor, queue: paired.queue }
                        if (! event.upgraded) {
                            loop.terminated = true
                            event.request.readyState = 'done'
                            event.request.result = new DBDatabase(database, queues)
                        }
                        dispatchEvent(event.request, new Event('success'))
                        let count = 0
                        for await (const event of transactions) {
                            const { names, extra: loop } = event
                            destructible.ephemeral(`transaction.${count++}`, async () => {
                                await memento.snapshot(snapshot => loop.run(snapshot, schema, names))
                            })
                        }
                        await memento.close()
                    } catch (error) {
                        console.log(error.stack)
                        rescue(error, [{ symbol: Memento.Error.ROLLBACK }])
                    }
                })
                destructible.promise.then(() => {
                }, error => console.log(error.stack))
            }
            break
        }
    }

    async _factory (shifter) {
        for await (const event of shifter) {
            await this._dispatch(event)
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
    }

    // **TODO** Put the compare function here.
    cmp = comparator
}

exports.DBFactory = DBFactory

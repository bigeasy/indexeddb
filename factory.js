const assert = require('assert')

const fs = require('fs').promises
const path = require('path')

const Transactor = require('./transactor')

const { DBOpenDBRequest } = require('./request')
const { DBDatabase } = require('./database')

const comparator = require('./compare')

const Queue = require('avenue')
const Future = require('perhaps')
const Destructible = require('destructible')
const Turnstile = require('turnstile')
const Memento = require('memento')

const { Event } = require('event-target-shim')

const Loop = require('./loop')

function createEvent(type, bubbles, cancelable, detail) {
    return {
        type,
        timeStamp: Date.now(),
        bubbles: bubbles,
        cancelable: cancelable,
        detail: detail || null,
    }
}

async function consume (shifter, consumer) {
    for await (const event of shifter) {
        await consumer.dispatch(event)
    }
    console.log('completed')
}

class ReadOnly {
    constructor (transaction) {
        this._transaction = transaction
    }

    async dispatch (event) {
    }
}

class ReadWrite extends ReadOnly {
    constructor (transaction) {
        super(transaction)
    }

    async dispatch (event) {
        switch (event.method) {
        case 'put': {
                console.log('set', event.name)
                this._transaction.set(event.name, event.value)
            }
            break
        }
    }
}

class SchemaUpdate extends ReadWrite {
    constructor (transaction, progress) {
        super(transaction)
    }

    async dispatch (event) {
        switch (event.method) {
        case 'store': {
                console.log('created', event.name)
                const key = {}
                key[event.keyPath] = 'indexeddb'
                await this._transaction.store(event.name, key)
            }
            break
        default: {
                console.log(event)
                await super.dispatch(event)
            }
            break
        }
    }
}

class Database {
    constructor (factory) {
        this._factory = factory
        this.transactor = new Transactor
    }
}

class DBFactory {
    static CREATE = Symbol('CREATE')

    constructor ({ directory }) {
        this._destructible = new Destructible(`indexeddb: ${directory}`)
        this._requests = new Turnstile(this._destructible.durable($ => $(), { isolated: true }, 'requests'))
        this._directory = directory
        this._queue = new Queue
        this._destructible.durable($ => $(), 'factory', this._factory(this._queue.shifter()))
        this._memento = null
        this._databases = {}
        this._mementos = {}
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
                const queues = { transactions: new Queue, schema: null }
                destructible.ephemeral($ => $(), 'open', async () => {
                    try {
                        const directory = path.join(this._directory, event.name)
                        const update = new SchemaUpdate()
                        await fs.mkdir(directory, { recurse: true })
                        const transactor = new Transactor
                        const database = new Database(this)
                        destructible.durable($ => $(), 'transactions', async () => {
                            for await (const entry of database.transactor.queue.shifter()) {
                                console.log(entry)
                            }
                        })
                        const memento = await Memento.open({
                            destructible: destructible.durable('memento'),
                            turnstile: this._turnstile,
                            directory: directory,
                            comparators: { indexeddb: comparator }
                        }, async update => {
                            queues.schema = new Loop
                            event.request.readyState = 'done'
                            event.request.result = new DBDatabase(database, queues)
                            console.log(event.request)
                            event.request.dispatchEvent(new Event('upgradeneeded'))
                            event.upgraded = true
                            await queues.schema.consume(new SchemaUpdate(update))
                        })
                        this._mementos[event.name] = { destructible, memento }
                        if (! event.upgraded) {
                            event.request.readyState = 'done'
                            event.request.result = new DBDatabase(database, queues)
                        }
                        event.request.dispatchEvent(new Event('success'))
                    } catch (error) {
                        console.log(error.stack)
                        rescue(error, [{ symbol: Memento.Error.ROLLBACK }])
                    }
                })
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
        throw Error
    }

    // **TODO** Put the compare function here.
    static cmp = null
}

async function foo (shifter) {
    for await (const event of shifter.iterator()) {
        switch (event.method) {
        case 'clear': {
                const { name, version, request } = event
                // If any databases are open...
                if (someDatabasesAreOpen()) {
                    request.dispatchEvent(createEvent('blocked', false, false))
                    setImmediate(() => {
                        queue.push({
                            method: open
                        })
                    })
                } else {
                    queue.push({
                        ...event, method: 'open'
                    })
                }
            }
            break
        case 'open': {
                const { name, version, request } = event
                try {
                    const memento = await Memento.open({
                    }, schema => {
                        const { queue, shifter } = new Queue().shifter().pair
                        //for await (const event of shifter.iterator()) {
                        //}
                    })
                } catch (error) {
                    rescue('rescue version problems')
                }
            }
            break
        case 'transaction': {
                const shifter = method.shifter()
                for await (const event of shifter.iterator()) {
                }
                break
            }
            break
        }
    }
}
exports.DBFactory = DBFactory

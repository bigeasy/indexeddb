const assert = require('assert')

const fs = require('fs').promises
const path = require('path')

const { DBOpenDBRequest } = require('./request')
const { DBDatabase } = require('./database')

const comparator = require('./compare')

const Queue = require('avenue')
const Future = require('perhaps')
const Destructible = require('destructible')
const Turnstile = require('turnstile')
const Memento = require('memento')

const { Event } = require('event-target-shim')

function createEvent(type, bubbles, cancelable, detail) {
    return {
        type,
        timeStamp: Date.now(),
        bubbles: bubbles,
        cancelable: cancelable,
        detail: detail || null,
    }
}

class Queue2 {
    constructor () {
        this._queue = []
        this._future = new Future
    }

    push (event) {
        this._queue.push(event)
        this._future.resolve()
    }

    async consume (consumer) {
        await this._future.promise
        while (this._queue.length != 0) {
            await consumer.dispatch(this._queue.shift())
        }
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
    constructor () {
        this.memento = null
    }

    async open (event) {
        this.memento = await Memento.open({
            destructible: this._destructible.ephemeral('memento'),
            turnstile: turnstile,
            directory: directory,
            comparators: { indexeddb: comparator }
        }, new SchemaUpdate().consume(event.shifter))
    }

    _startTransactions () {
        WAITS: for (const name in this._waits) {
            const node = this._waits[name]
            if (node != null && node.wait.state == 'waiting') {
                let iterator = node.wait.head
                while (iterator != null) {
                    if (this._waits[iterator.name][0] !== iterator) {
                        continue WAITS
                    }
                    iterator = iterator.next
                }
                node.wait.state = 'running'
                // **TODO** Get this thing to run!!
            }
        }
    }

    _shiftTransaction (wait) {
        let iterator = node.wait.head
        while (iterator != null) {
            assert(iterator === this._waits[iterator.name])
            this._waits.shift()
            iterator = iterator.next
        }
    }

    async transaction (event) {
        const wait = { head: null, state: 'waiting' }
        for (const name of events.names) {
            const node = { wait, name, next: wait.head }
            wait.head = node
            this._waits[name].push(node)
        }
        this._startTransactions()
    }

    async dispatch (event) {
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
                const destructible = this._destructible.ephemeral($ => $(), `database.${event.name}`)
                const queues = { transactions: new Queue, schema: null }
                destructible.ephemeral($ => $(), 'open', async () => {
                    try {
                        // **TODO** Assert that it does not already exist.
                        const directory = path.join(this._directory, event.name)
                        const update = new SchemaUpdate()
                        await fs.mkdir(directory, { recurse: true })
                        const memento = await Memento.open({
                            destructible: destructible.durable('memento'),
                            turnstile: this._turnstile,
                            directory: directory,
                            comparators: { indexeddb: comparator }
                        }, async update => {
                            queues.schema = new Queue2
                            event.request.readyState = 'done'
                            event.request.result = new DBDatabase(this, queues)
                            console.log(event.request)
                            event.request.dispatchEvent(new Event('upgradeneeded'))
                            event.upgraded = true
                            console.log('here')
                            await queues.schema.consume(new SchemaUpdate(update))
                            console.log('there')
                        })
                        this._databases[event.name] = new Database(destructible, memento)
                        if (! event.upgraded) {
                            event.request.readyState = 'done'
                            event.request.result = new DBDatabase(this)
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

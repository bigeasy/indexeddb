const { DBOpenDBRequest } = require('./request')
const { DBDatabase } = require('./database')

const comparator = require('./compare')

const Destructible = require('destructible')
const Memento = require('memento')

const Turnstile = require('turnstile')
Turnstile.Set = require('turnstile/set')

function createEvent(type, bubbles, cancelable, detail) {
    return {
        type,
        timeStamp: Date.now(),
        bubbles: bubbles,
        cancelable: cancelable,
        detail: detail || null,
    }
}

class DBFactory {
    static CREATE = Symbol('create')

    constructor (directory) {
        this._destructible = new Destructible([ 'indexeddb', directory ])
        const requests = new Turnstile(this._destructible.durable('requests'), { turnstiles: 4 })
        this._requests = new Turnstile.Set(requests, this._request, this)
        this._queue = new Map
        this._memento = null
    }

    async _request ({ body }) {
        const operations = this._queue.get(body)
        while (operations.length != 0) {
            await operations.shift()()
        }
        this._queue.delete(body)
    }

    _enqueue (name, operation) {
        const queue = this._queue.get(name)
        if (queue == null) {
            this._queue.set(name, [ operation ])
            this._requests.add(name)
        } else {
            queue.push(f)
        }
    }

    open (name, version = 0) {
        const request = new DBOpenDBRequest()
        this._enqueue(DBFactory.CREATE, async () => {
            const queue = new Queue
            const shifter = queue.shifter()
            const memento = await Memento.open({
                destructible: this._destructible.durable('memento'),
                directory: directory,
                comparators: { indexeddb: comparator }
            }, async schema => {
                for await (const event of shifter.iterator()) {
                    // We are required by the spec to queue a task...
                    switch (event.method) {
                    case 'create':
                    case 'rename':
                    case 'remove':
                    }
                }
            })
            request.readyState = 'done'
            request.result = new DBDatabase(this)
            request.dispatchEvent(createEvent('upgradeneeded', false, false))
            request.dispatchEvent(createEvent('success', false, false))
        })
        return request
    }
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
                        for await (const event of shifter.iterator()) {
                        }
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

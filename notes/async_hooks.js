const hooks = require('async_hooks')
const fs = require('fs')
const fsp = require('fs').promises
const util = require('util')
const cadence = require('cadence')

async function main (callbacks) {
    const promise = Promise.resolve(1)
    await promise
    fs.writeFileSync(1, 'running\n')
    if (false) hooks.createHook({
        init() {}
    }).enable()
    const map = new Map
    const __hook = hooks.createHook({
        init(asyncId, type, triggerAsyncId, resource) {
            count++
            map.set(asyncId, { type, triggerAsyncId, parent: null, children: [] })
        },
        before (asyncId) {
            map.delete(asyncId)
        },
        destroy (asyncId) {
            map.delete(asyncId)
        },
        promiseResolve (asyncId) {
            map.delete(asyncId)
        }
    })
    function getPromises () {
        const copy = new Map
        for (const [ key, { asyncId, type, triggerAsyncId, before, after, resolved } ] of map) {
            copy.set(key, { asyncId, type, triggerAsyncId, before, after, resolved, parent: null, children: [] })
        }
        for (const [ key, value ] of copy) {
            if ((value.parent = copy.get(value.triggerAsyncId) || null) != null) {
                value.parent.children.push(value)
            }
        }
        const roots = []
        const leaves = []
        for (const value of copy.values()) {
            if (value.parent == null) {
                roots.push(value)
            }
            if (value.children == 0) {
                leaves.push(value)
            }
        }
        const promises = leaves.filter(leaf => leaf.type == 'PROMISE')
        fs.writeFileSync(1, `roots ${util.inspect(roots, { depth: null })}\n`)
        //fs.writeFileSync(1, `leaves ${util.inspect(leaves, { depth: null })}\n`)
        return promises
    }
    let looped = 0
    /*
        const hook = hooks.createHook({
            init(asyncId, type, triggerAsyncId, resource) {
                map.set(asyncId, { asyncId, type, triggerAsyncId })
            },
            __after (asyncId) {
                fs.writeFileSync(1, `after ${asyncId}\n`)
                map.delete(asyncId)
                check()
            },
            destroy (asyncId) {
                fs.writeFileSync(1, `destroy ${asyncId}\n`)
                map.delete(asyncId)
                check()
            },
            promiseResolve (asyncId) {
                fs.writeFileSync(1, `resolve ${asyncId}\n`)
                check()
                map.delete(asyncId)
            }
        })
        hook.enable()
    while (callbacks.length != 0) {
        let latch
        const promise = new Promise(resolve => latch = { resolve })
        let checking = false
        function check () {
            if (checking) {
                const promises = getPromises()
                if (promises.length == 1 && promises[0].parent.triggerAsyncId == hooks.executionAsyncId()) {
                    fs.writeFileSync(1, '.... unlocking\n')
                    latch.resolve.call()
                }
            }
        }
        callbacks.shift()()
        checking = true
        check()
        await promise
    }
        hook.disable()
        map.clear()
    */
    let count = 0
    const hook = hooks.createHook({
        init(asyncId, type, triggerAsyncId, resource) {
            map.set(asyncId, { asyncId, type, triggerAsyncId })
        },
        after (asyncId) {
            map.delete(asyncId)
        }
    })
    hook.enable()
    let latch
    let checking = false
    function check () {
        if (checking) {
            const promises = getPromises()
            //fs.writeFileSync(1, `events ${util.format(events)}\n`) //util.inspect(promises, { depth: null }))
            //fs.writeFileSync(1, `promises ${promises.length}\n`) //util.inspect(promises, { depth: null }))
            if (promises.length == 1) {
                latch.resolve.call()
            }
        }
    }
    function setEqual (left, right) {
        if (left.size != right.size) {
            return false
        }
        for (const object of left) {
            if (! right.has(object)) {
                return false
            }
        }
        return true
    }
    await async function () {
        await true
        map.clear()
        fs.writeFileSync(1, `>>>>>>> ${hooks.executionAsyncId()}\n`)
        while (callbacks.length != 0) {
            checking = false
            callbacks.shift()()
            checking = true
            let previous = new Set
            for (;;) {
                await true
                map.delete(hooks.executionAsyncId())
                map.delete(hooks.triggerAsyncId())
                const next = new Set(map.keys())
                if (setEqual(previous, next)) {
                    break
                }
                previous = next
            }
            fs.writeFileSync(1, `>>>>>>> ${hooks.executionAsyncId()}\n`)
        }
    } ()
        hook.disable()
        map.clear()
    /*
    function outer () {
        return new Promise(resolve => {
            callbacks.shift()()
            resolve(inner())
        })
    }
    const f = cadence(function (step) {
        step.loop([], function () {
            if (callbacks.length == 0) {
                return [ loop.break ]
            }
            callbacks.shift()()
            return new Promise(resolve => resolve(1))
        }, function () {
            step.loop([], function () {
                const promises = getPromises()
                if (promises.length == 1 || ++looped == 7) {
                    return [ step.break ]
                }
            })
        })
    })
    await new Promise(resolve => {
        f(() => resolve())
    })
    */
    hook.disable()
    hook.enable()
    /*
    while (callbacks.length != 0) {
        callbacks.shift()()
        retry = 0
        for (;;) {
            await promise
            fs.writeFileSync(1, `>> ${count}\n`)
            const copy = new Map
            for (const [ key, { type, triggerAsyncId } ] of map) {
                copy.set(key, { type, triggerAsyncId, parent: null, children: [] })
            }
            for (const [ key, value ] of copy) {
                if ((value.parent = copy.get(value.triggerAsyncId) || null) != null) {
                    value.parent.children.push(value)
                }
            }
            const roots = []
            const leaves = []
            for (const value of copy.values()) {
                if (value.parent == null) {
                    roots.push(value)
                }
                if (value.children.length == 0) {
                    leaves.push(value)
                }
            }
            const promises = leaves.filter(leaf => leaf.type == 'PROMISE')
            const nonPromises = leaves.filter(leaf => leaf.type != 'PROMISE')
            if (promises == 1) {
                break
            }
            if (++looped == 8) {
                break
            }
            count = 0
        }
        count = 0
    }
    */
    events.push('looped')
    hook.disable()
}

const events = []
main([function () {
    events.push('before first')
}, function () {
    events.push('first')
    new Promise(resolve => {
        events.push('promise')
        new Promise(resolve => {
            events.push('promise nested')
            resolve(1)
        }).then(() => {
            events.push('promise then')
            setTimeout(function () {
                events.push('timeout')
            }, 0)
            return 1
        })
        resolve(1)
    })
}, function () {
    events.push('second')
    async function foo () {
        events.push('async 1')
        await 1
        events.push('async 2')
        await 2
        events.push('async 3')
        for (let i = 0; i < 10; i++) {
            await i
        }
        events.push('async 4')
        fs.writeFileSync(1, '.... async\n')
        await fsp.readFile(__filename)
        events.push('filed done')
        fs.writeFileSync(1, '.... async done\n')
    }
    const promise = foo()
    promise.then(() => {
        events.push('async then')
        fs.writeFileSync(1, '.... async then\n')
        setTimeout(function () {
            events.push('timeout')
            fs.writeFileSync(1, events.join('\n') + '\n')
        }, 0)
        return 1
    }).then(() => {
        events.push('async then then')
        return 1
    })
}, function () {
        fs.writeFileSync(1, '.... last\n')
    events.push('last')
}])

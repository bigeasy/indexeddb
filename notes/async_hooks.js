const hooks = require('async_hooks')
const fs = require('fs')
const fsp = require('fs').promises
const util = require('util')
const cadence = require('cadence')

async function main (callbacks) {
    const promise = Promise.resolve(1)
    await promise
    console.log('running')
    let count = 0
    if (false) hooks.createHook({
        init() {}
    }).enable()
    const map = new Map
    const hook = hooks.createHook({
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
            return promises
    }
    let looped = 0
    function inner () {
        return new Promise(resolve => {
            if (++looped == 5) {
                process.exit()
            }
            console.log(promises, count)
            if (promises.length == 1) {
                resolve(outer())
            } else {
                resolve(inner())
            }
        })
    }
    while (callbacks.length != 0) {
        let latch
        let checking = false
        const promise = new Promise(resolve => latch = { resolve })
        function check () {
            if (checking) {
                const promises = getPromises()
                console.log('promises', promises.length) //util.inspect(promises, { depth: null }))
                if (promises.length == 1) {
                    latch.resolve.call()
                }
            }
        }
        const hook = hooks.createHook({
            init(asyncId, type, triggerAsyncId, resource) {
                map.set(asyncId, { type, triggerAsyncId, parent: null, children: [] })
            },
            before (asyncId) {
                map.delete(asyncId)
            },
            destroy (asyncId) {
                map.delete(asyncId)
            },
            promiseResolve (asyncId) {
                check()
                map.delete(asyncId)
            }
        })
        hook.enable()
        callbacks.shift()()
        checking = true
        check()
        await promise
        hook.disable()
        map.clear()
    }
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
                console.log('here', util.inspect(promises, { depth: null }))
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
            //console.log('roots', util.inspect(roots, { depth: null }))
            //console.log('leaves', util.inspect(leaves, { depth: null }))
            const promises = leaves.filter(leaf => leaf.type == 'PROMISE')
            const nonPromises = leaves.filter(leaf => leaf.type != 'PROMISE')
            console.log('promises', util.inspect(promises, { depth: null }))
            console.log('non-promises', util.inspect(nonPromises, { depth: null }))
            console.log('map', map.size, hooks.triggerAsyncId(), hooks.executionAsyncId())
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
        await 1
        await 1
        await 1
        events.push('async')
        await fsp.readFile(__filename)
        events.push('async done')
        fs.writeFileSync(1, '.... async\n')
    }
    const promise = foo()
    promise.then(() => {
        events.push('async then')
        fs.writeFileSync(1, '.... async then\n')
        setTimeout(function () {
            events.push('timeout')
            console.log(events.join('\n'))
        }, 0)
        return 1
    }).then(() => {
        events.push('async then then')
        return 1
    })
}, function () {
    events.push('last')
}])

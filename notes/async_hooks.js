const hooks = require('async_hooks')
const fs = require('fs')
const fsp = require('fs').promises
const util = require('util')
const cadence = require('cadence')
const callback = require('comeuppance')
const Trampoline = require('reciprocate')

const events = []

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

const calledback = cadence(function (step, callbacks, asynchronous = true) {
    fs.writeFileSync(1, '>>> cadence\n')
    events.length = 0
    const trace = function () {
        if (asynchronous) {
            const hook = hooks.createHook({
                init(asyncId, type, triggerAsyncId, resource) {
                    trace.map.set(asyncId, { asyncId, type, triggerAsyncId })
                },
                after (asyncId) {
                    trace.map.delete(asyncId)
                }
            })
            hook.enable()
            return { hook, map: new Map, previous: new Set }
        }
        return null
    } ()
    step(function () {
        if (asynchronous) {
            return new Promise(resolve => resolve(1))
        }
    }, function () {
        events.length = 0
        step.forEach([ callbacks ], function (callback) {
            callback()
            if (asynchronous) {
                step.loop([], function () {
                    return new Promise(resolve => resolve(1))
                }, function () {
                    trace.map.delete(hooks.executionAsyncId())
                    trace.map.delete(hooks.triggerAsyncId())
                    const next = new Set(trace.map.keys())
                    if (setEqual(trace.previous, next)) {
                        return [ step.break ]
                    }
                    trace.previous = next
                })
            }
        })
    }, function () {
        events.push('looped')
        if (asynchronous) {
            trace.hook.disable()
        }
    })
})

async function asyncAwait (callbacks) {
    fs.writeFileSync(1, '>>> async/await\n')
    events.length = 0
    const map = new Map
    const hook = hooks.createHook({
        init(asyncId, type, triggerAsyncId, resource) {
            map.set(asyncId, { asyncId, type, triggerAsyncId })
        },
        after (asyncId) {
            map.delete(asyncId)
        }
    })
    hook.enable()
    await async function () {
        await true
        while (callbacks.length != 0) {
            callbacks.shift()()
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
        }
    } ()
    hook.disable()
    events.push('looped')
}

// Cadence is working and well enough that it is fit for purpose.

// Can't get this to work...
function trampolined (trampoline, callbacks, asynchronous) {
    events.length = 0
    const trace = function () {
        if (asynchronous) {
            const hook = hooks.createHook({
                init(asyncId, type, triggerAsyncId, resource) {
                    trace.map.set(asyncId, { asyncId, type, triggerAsyncId })
                },
                after (asyncId) {
                    trace.map.delete(asyncId)
                }
            })
            hook.enable()
            return { map: new Map, hook, previous: new Set }
        }
        return null
    } ()
    async function seek () {
        await true
        // ...because these both have a value of zero.
        trace.map.delete(hooks.executionAsyncId())
        trace.map.delete(hooks.triggerAsyncId())
        const next = new Set(trace.map.keys())
        if (! setEqual(trace.previous, next)) {
            trace.previous = next
            trampoline.promised(() => seek())
        } else {
            trampoline.sync(() => dispatch())
        }
    }
    function dispatch () {
        if (callbacks.length != 0) {
            callbacks.shift()()
            if (asynchronous) {
                trampoline.promised(() => seek())
            } else {
                trampoline.sync(() => dispatch())
            }
        } else if (asynchronous) {
            trace.hooks.disable()
            events.push('looped')
        }
    }
    if (asynchronous) {
        trampoline.promised(async () => {
            await true
            dispatch()
        })
    } else {
        dispatch()
        events.push('looped')
    }
}

async function main (callbacks) {
    await asyncAwait(callbacks.slice())
    await new Promise(resolve => setTimeout(resolve, 1000))
    await callback(callback => calledback(callbacks.slice(), callback))
    await new Promise(resolve => setTimeout(resolve, 1000))
    calledback(callbacks.slice(), false, (error) => {
        events.push('called back')
    })
}

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
                events.push('timeout one')
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
        await fsp.readFile(__filename)
        events.push('filed done')
    }
    const promise = foo()
    promise.then(() => {
        events.push('async then')
        setTimeout(function () {
            events.push('timeout two')
            fs.writeFileSync(1, events.join('\n') + '\n')
        }, 0)
        return 1
    }).then(() => {
        events.push('async then then')
        return 1
    })
}, function () {
    events.push('last')
}])

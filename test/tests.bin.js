#!/usr/bin/env node
/*

    ___ usage ___ en_US ___
    node highlight.bin.js <options> [sockets directory, sockets directory...]

    options:

        --help

            display help message

        --mode <string>

            generator mode, 'text' or 'code', default 'text'.

    ___ $ ___ en_US ___

        select is required:
            the `--select` argument is a required argument

        language is required:
            the `--language` argument is a required argument
    ___ . ___

 */
require('arguable')(module, async arguable => {
    const util = require('util')
    const fs = require('fs').promises
    const path = require('path')
    const cheerio = require('cheerio')
    const test = arguable.argv[0]
    const source = await fs.readFile(test, 'utf8')
    const $ = cheerio.load(source)
    const $_ = require('programmatic')
    const includes = [], blocks = []
    $('script').each(function () {
        const src = this.attribs.src
        if (src == null) {
            blocks.push($_($(this).html()))
        } else {
            includes.push(src)
        }
    })
    const dir = path.dirname(test)
    const sources = []
    for (const include of includes) {
        const file = path.resolve(dir, path.isAbsolute(include) ? `..${include}` : include)
        // sources.push(await fs.readFile(file, 'utf8'))
    }
    for (const block of blocks) {
        sources.push(block)
    }
    const name = path.basename(test, '.htm')
    await fs.writeFile(path.resolve(__dirname, `${name}.t.js`), $_(`
        require('proof')(0, async okay => {
            const assert = require('assert')
            const Future = require('perhaps')
            const path = require('path')
            const fs = require('fs').promises
            const directory = path.join(__dirname, 'tmp', ${util.inspect(name)})
            if (fs.rm != null) {
                await fs.rm(directory, { recursive: true, force: true })
            } else {
                await fs.rmdir(directory, { recursive: true })
            }
            await fs.mkdir(directory, { recursive: true })

            const indexedDB = require('..').create({ directory })
            const window = { indexedDB }
            function assert_equals (actual, expected, message) {
                okay.inc(1)
                okay(actual, expected, message)
            }
            function assert_true (condition, message) {
                okay.inc(1)
                okay(condition, message)
            }
            const scope = { name: null, count: 0 }
            class Test {
                constructor (future, name, properties) {
                    this.name = name
                    this.phase = this.phases.INITIAL
                    this.status = this.statuses.NORUN
                    this.timeout_id = null
                    this.index = null
                    this.properites = properties || {}
                    this.steps = []
                    this._future = future
                }
                statuses = {
                    PASS:0,
                    FAIL:1,
                    TIMEOUT:2,
                    NOTRUN:3,
                    PRECONDITION_FAILED:4
                }
                phases = {
                    INITIAL:0,
                    STARTED:1,
                    HAS_RESULT:2,
                    CLEANING:3,
                    COMPLETE:4
                }
                step (func, ...vargs) {
                    const self = vargs.length == 0 ? this : vargs.shift()
                    if (this.phase > this.phases.STARTED) {
                        return
                    }
                    this.phase = this.phases.STARTED
                    try {
                        return func.apply(self, vargs)
                    } catch (error) {
                        throw error
                    }
                }
                step_func (f, self, ...vargs) {
                    if (arguments.length == 1) {
                        self = this
                    }
                    return () => {
                        return this.step.apply(this, [ f, self ].concat(vargs))
                    }
                }
                done () {
                    this._future.resolve()
                }
            }
            function createdb (test, ...vargs) {
                const name = vargs.shift() || 'test-db' + new Date().getTime() + Math.random()
                const version = vargs.shift() || null
                const request = version ? indexedDB.open(name, version) : indexedDB.open(name)
                function autoFail (eventName, currentTest) {
                    request.manuallyHandled = {}
                    request.addEventListener(eventName, function (event) {
                        if (currentTest === test) {
                            test.step(function () {
                                if (! request.manuallyHandled[eventName]) {
                                    assert(false, 'unexpected open.' + eventName + ' event')
                                }
                                if (e.target.result + '' == '[object IDBDatabase]' && ! this.db) {
                                    this.db = e.target.result
                                    this.db.onerror = fail(test, 'unexpected db.error')
                                    this.db.onabort = fail(test, 'unexpected db.abort')
                                    this.db.onversionchange = fail(test, 'unexpected db.abort')
                                }
                            })
                        }
                    })
                    request.__defineSetter__('on' + eventName, function(handler) {
                        request.manuallyHandled[eventName] = true
                        if (!handler) {
                            request.addEventListener(eventName, function() {})
                        } else {
                            request.addEventListener(eventName, test.step_func(handler))
                        }
                    })
                }
                autoFail('upgradeneeded', test)
                autoFail('success', test)
                autoFail('blocked', test)
                autoFail('error', test)
                return request
            }
            const futures = []
            function assert_throws_dom(type, func, description) {
                try {
                    func.call(null)
                } catch (error) {
                    if (error instanceof assert.AssertionError) {
                        throw error
                    }
                    const names = {
                        INDEX_SIZE_ERR: 'IndexSizeError',
                        HIERARCHY_REQUEST_ERR: 'HierarchyRequestError',
                        WRONG_DOCUMENT_ERR: 'WrongDocumentError',
                        INVALID_CHARACTER_ERR: 'InvalidCharacterError',
                        NO_MODIFICATION_ALLOWED_ERR: 'NoModificationAllowedError',
                        NOT_FOUND_ERR: 'NotFoundError',
                        NOT_SUPPORTED_ERR: 'NotSupportedError',
                        INUSE_ATTRIBUTE_ERR: 'InUseAttributeError',
                        INVALID_STATE_ERR: 'InvalidStateError',
                        SYNTAX_ERR: 'SyntaxError',
                        INVALID_MODIFICATION_ERR: 'InvalidModificationError',
                        NAMESPACE_ERR: 'NamespaceError',
                        INVALID_ACCESS_ERR: 'InvalidAccessError',
                        TYPE_MISMATCH_ERR: 'TypeMismatchError',
                        SECURITY_ERR: 'SecurityError',
                        NETWORK_ERR: 'NetworkError',
                        ABORT_ERR: 'AbortError',
                        URL_MISMATCH_ERR: 'URLMismatchError',
                        QUOTA_EXCEEDED_ERR: 'QuotaExceededError',
                        TIMEOUT_ERR: 'TimeoutError',
                        INVALID_NODE_TYPE_ERR: 'InvalidNodeTypeError',
                        DATA_CLONE_ERR: 'DataCloneError'
                    }

                    const codes = {
                        IndexSizeError: 1,
                        HierarchyRequestError: 3,
                        WrongDocumentError: 4,
                        InvalidCharacterError: 5,
                        NoModificationAllowedError: 7,
                        NotFoundError: 8,
                        NotSupportedError: 9,
                        InUseAttributeError: 10,
                        InvalidStateError: 11,
                        SyntaxError: 12,
                        InvalidModificationError: 13,
                        NamespaceError: 14,
                        InvalidAccessError: 15,
                        TypeMismatchError: 17,
                        SecurityError: 18,
                        NetworkError: 19,
                        AbortError: 20,
                        URLMismatchError: 21,
                        QuotaExceededError: 22,
                        TimeoutError: 23,
                        InvalidNodeTypeError: 24,
                        DataCloneError: 25,

                        EncodingError: 0,
                        NotReadableError: 0,
                        UnknownError: 0,
                        ConstraintError: 0,
                        DataError: 0,
                        TransactionInactiveError: 0,
                        ReadOnlyError: 0,
                        VersionError: 0,
                        OperationError: 0,
                        NotAllowedError: 0
                    }

                    const codeNames = {}

                    for (const key in codes) {
                        codeNames[codes[key]] = key
                    }

                    okay({
                        name: error.name,
                        code: error.code
                    }, {
                        name: type,
                        code: codes[type],
                    }, \`\${scope.name} - assertion \${scope.count++}\`)

                    if (typeof type == 'number') {
                        throw new Error
                    } else {
                        const name = type in codes ? codes[type] : type
                    }
                    okay.inc(1)
                }
            }
            function assert_throws_js(constructor, func, description) {
                try {
                    func.call(null)
                    assert(false, 'did not throw')
                } catch (error) {
                    if (error instanceof assert.AssertionError) {
                        throw error
                    }
                    if (error.constructor !== constructor) {
                        console.log(error.stack)
                    }
                    okay(error.constructor === constructor, \`\${scope.name} - assertion \${scope.count++}\`)
                    okay.inc(1)
                }
            }
            const self = {}
            function test (f, name) {
                scope.name = name
                scope.count = 0
                f()
            }
            const document = { title: 'Web Platform Tests' }
            function async_test (...vargs) {
                const properties = vargs.pop()
                scope.name = vargs.pop()
                const f = vargs.pop() || null
                const future = new Future
                futures.push(future)
                if (f != null) {
                }
                return new Test(future)
            }
            `, sources.join('\n'), `
            for (const future of futures) {
                await future.promise
            }
        })
    `) + '\n')
})

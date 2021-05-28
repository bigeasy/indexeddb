module.exports = async function (okay, name) {
    const { Future } = require('perhaps')
    const fs = require('fs').promises
    const assert = require('assert')
    const compare = require('../compare')
    const path = require('path')
    const rmrf = require('../rmrf')
    const directory = path.join(__dirname, 'tmp', name)
    await rmrf(process.version, fs, directory)
    await fs.mkdir(directory, { recursive: true })
    function globalize (value, name = null) {
        if (name == null) {
            switch (typeof value) {
            case 'function':
                global[value.name] = value
                okay.leak(value.name)
            }
        } else {
            global[name] = value
            okay.leak(name)
        }
    }
    globalize('wpt', 'location')
    globalize({ title: 'wpt', location: 'wpt' }, 'document')
    const { DBRequest } = require('../request')
    globalize(DBRequest, 'IDBRequest')
    const { DBVersionChangeEvent } = require('../event')
    globalize(DBVersionChangeEvent, 'IDBVersionChangeEvent')
    const { DBKeyRange } = require('../keyrange')
    globalize(DBKeyRange, 'IDBKeyRange')
    const indexedDB = require('..').create({ directory })
    globalize(indexedDB, 'indexedDB')
    globalize({ indexedDB }, 'window')
    const tests = []
    let count = 0
    class Test {
        constructor (future, name, properties) {
            this.name = name || `test-${++count}`
            this.phase = this.phases.INITIAL
            this.status = this.statuses.NORUN
            this.timeout_id = null
            this._janitors = []
            this.index = null
            this.properites = properties || {}
            this._future = future
            tests.push(this)
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
        unreached_func (description) {
            return this.step_func(function () {
                throw new Error(`should not reach: ${description}`)
            })
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
            const step = this.step
            return function (...vargs) {
                return step.apply(self, [ f, self ].concat(vargs))
            }
        }
        add_cleanup (f) {
            this._janitors.push(f)
        }
        done () {
            this.phase = this.phases.COMPLETE
            while (this._janitors.length != 0) {
                this._janitors.shift()()
            }
            this._future.resolve()
        }
    }
    globalize(Test)
    const scope = {}, futures = []
    function async_test (...vargs) {
        const f = typeof vargs[0] == 'function' ? vargs.shift() : null
        scope.name = typeof vargs[0] == 'string' ? vargs.shift() : name
        const properties = vargs.pop() || null
        scope.count = 0
        const future = new Future
        futures.push(future)
        if (f != null) {
            f(new Test(future))
        }
        return new Test(future)
    }
    globalize(async_test)
    function test (f, name) {
        scope.name = name
        scope.count = 0
        f()
    }
    globalize(test)
    function step_timeout (f, t, ...vargs) {
        setTimeout(function () {
            f.apply(this, vargs)
        }.bind(this), t)
    }
    globalize(step_timeout)
    function fail (test, message) {
        return function(e) {
            if (e && e.message && e.target.error) {
                assert.fail(message + " (" + e.target.error.name + ": " + e.message + ")")
            } else if (e && e.message) {
                assert.fail(message + " (" + e.message + ")")
            } else if (e && e.target.readyState === 'done' && e.target.error) {
                assert.fail(message + " (" + e.target.error.name + ")")
            } else {
                assert.fail(message)
            }
        }
    }
    globalize(fail)
    function assert_true (condition, message) {
        okay(condition, `${scope.name} - assertion ${scope.count++}`)
    }
    globalize(assert_true)
    function assert_equals (actual, expected, message) {
        message || (message = `assertion ${scope.count++}`)
        okay(actual, expected, `${scope.name} - ${message}`)
    }
    globalize(assert_equals)
    function assert_key_equals (actual, expected, message)  {
        assert_equals(compare(actual, expected), 0, message)
    }
    globalize(assert_key_equals)
    function assert_array_equals (actual, expected, message) {
        assert_equals(actual, expected, message)
    }
    globalize(assert_array_equals)
    function assert_readonly (object, property, message) {
        const save = object[property]
        try {
            object[property] = save + 'a'
            okay(object[property], save, message)
        } finally {
            object[property] = save
        }
    }
    globalize(assert_readonly)
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
            okay(error.constructor === constructor, `${scope.name} - assertion ${scope.count++}`)
        }
    }
    globalize(assert_throws_js)
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
            }, `${scope.name} - assertion ${scope.count++}`)

            if (typeof type == 'number') {
                throw new Error
            } else {
                const name = type in codes ? codes[type] : type
            }
        }
    }
    globalize(assert_throws_dom)
    const janitors = []
    function add_completion_callback (janitor) {
        janitors.push(janitor)
    }
    globalize(add_completion_callback)
    // `createdb(test[, name][, version])`
    //
    // Create a database with an optional name that always includes a random
    // suffix and an optional version. If there is no version the database is
    // opened without a version.
    //
    // We set handlers for the error states error, abort and version change and
    // raise an exception if the user has not explicitly set a handler for those
    // events.
    function createdb (test, ...vargs) {
        const name = vargs.shift() || 'test-db' + new Date().getTime() + Math.random()
        const version = vargs.shift() || null
        const request = version ? indexedDB.open(name, version) : indexedDB.open(name)
        const handled = {}
        function fail (eventName, currentTest) {
            request.addEventListener(eventName, function (event) {
                if (currentTest === test) {
                    // This step thing kills me. It's a synchronous function. What's
                    // the point?
                    test.step(function () {
                        if (! handled[eventName]) {
                            assert(false, 'unexpected open.' + eventName + ' event')
                        }
                        // What are we asserting here?
                        if (! this.db) {
                            this.db = event.target.result
                            //this.db.onerror = fail(test, 'unexpected db.error')
                            //this.db.onabort = fail(test, 'unexpected db.abort')
                            //this.db.onversionchange = fail(test, 'unexpected db.abort')
                        }
                    })
                }
            })
            request.__defineSetter__('on' + eventName, function(handler) {
                handled[eventName] = true
                if (! handler) {
                    request.addEventListener(eventName, function() {})
                } else {
                    request.addEventListener(eventName, test.step_func(handler))
                }
            })
        }
        fail('upgradeneeded', test)
        fail('success', test)
        fail('blocked', test)
        fail('error', test)
        return request
    }
    globalize(createdb)
    async function harness (f) {
        indexedDB.destructible.promise.catch(error => console.log(error.stack))
        const dones = []
        add_completion_callback(function () {
            for (const test of tests) {
                if (test.db) {
                    const done = new Future
                    dones.push(done)
                    test.db.close()
                    indexedDB.deleteDatabase(test.db.name).onsuccess = function () {
                        console.log('did delete')
                        done.resolve()
                    }
                }
            }
        })
        await f()
        while (futures.length != 0) {
            await futures.shift().promise
        }
        while (janitors.length != 0) {
            janitors.shift()()
        }
        while (dones.length != 0) {
            await dones.shift().promise
        }
        console.log('done')
        await indexedDB.destructible.destroy().promise
    }
    globalize(harness)
    function indexeddb_test(upgrade_func, open_func, description, options) {
      async_test(function(t) {
        options = Object.assign({upgrade_will_abort: false}, options);
        var dbname = location + '-' + t.name;
        var del = indexedDB.deleteDatabase(dbname);
        del.onerror = t.unreached_func('deleteDatabase should succeed');
        var open = indexedDB.open(dbname, 1);
        open.onupgradeneeded = t.step_func(function() {
          var db = open.result;
          t.add_cleanup(function() {
            // If open didn't succeed already, ignore the error.
            open.onerror = function(e) {
              e.preventDefault();
            };
            db.close();
            indexedDB.deleteDatabase(db.name);
          });
          var tx = open.transaction;
          upgrade_func(t, db, tx, open);
        });
        if (options.upgrade_will_abort) {
          open.onsuccess = t.unreached_func('open should not succeed');
        } else {
          open.onerror = t.unreached_func('open should succeed');
          open.onsuccess = t.step_func(function() {
            var db = open.result;
            if (open_func)
              open_func(t, db, open);
          });
        }
      }, description);
    }
    globalize(indexeddb_test)
    return futures
}

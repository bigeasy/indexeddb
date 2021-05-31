module.exports = async function (okay, name) {
    const { Future } = require('perhaps')
    const { Event } = require('event-target-shim')
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
    if (process.versions.node.split('.')[0] < 15) {
        globalize(Event, 'Event')
    } else {
        global.Event = Event
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
    // Copy and paste from WPT.

    const replacements = {
        "0": "0",
        "1": "x01",
        "2": "x02",
        "3": "x03",
        "4": "x04",
        "5": "x05",
        "6": "x06",
        "7": "x07",
        "8": "b",
        "9": "t",
        "10": "n",
        "11": "v",
        "12": "f",
        "13": "r",
        "14": "x0e",
        "15": "x0f",
        "16": "x10",
        "17": "x11",
        "18": "x12",
        "19": "x13",
        "20": "x14",
        "21": "x15",
        "22": "x16",
        "23": "x17",
        "24": "x18",
        "25": "x19",
        "26": "x1a",
        "27": "x1b",
        "28": "x1c",
        "29": "x1d",
        "30": "x1e",
        "31": "x1f",
        "0xfffd": "ufffd",
        "0xfffe": "ufffe",
        "0xffff": "uffff",
    }
    function format_value(val, seen)
    {
        if (!seen) {
            seen = [];
        }
        if (typeof val === "object" && val !== null) {
            if (seen.indexOf(val) >= 0) {
                return "[...]";
            }
            seen.push(val);
        }
        if (Array.isArray(val)) {
            let output = "[";
            if (val.beginEllipsis !== undefined) {
                output += "…, ";
            }
            output += val.map(function(x) {return format_value(x, seen);}).join(", ");
            if (val.endEllipsis !== undefined) {
                output += ", …";
            }
            return output + "]";
        }

        switch (typeof val) {
        case "string":
            val = val.replace(/\\/g, "\\\\");
            for (var p in replacements) {
                var replace = "\\" + replacements[p];
                val = val.replace(RegExp(String.fromCharCode(p), "g"), replace);
            }
            return '"' + val.replace(/"/g, '\\"') + '"';
        case "boolean":
        case "undefined":
            return String(val);
        case "number":
            // In JavaScript, -0 === 0 and String(-0) == "0", so we have to
            // special-case.
            if (val === -0 && 1/val === -Infinity) {
                return "-0";
            }
            return String(val);
        case "object":
            if (val === null) {
                return "null";
            }

            // Special-case Node objects, since those come up a lot in my tests.
            // I
            // ignore namespaces.
            if (is_node(val)) {
                switch (val.nodeType) {
                case Node.ELEMENT_NODE:
                    var ret = "<" + val.localName;
                    for (var i = 0; i < val.attributes.length; i++) {
                        ret += " " + val.attributes[i].name + '="' + val.attributes[i].value + '"';
                    }
                    ret += ">" + val.innerHTML + "</" + val.localName + ">";
                    return "Element node " + truncate(ret, 60);
                case Node.TEXT_NODE:
                    return 'Text node "' + truncate(val.data, 60) + '"';
                case Node.PROCESSING_INSTRUCTION_NODE:
                    return "ProcessingInstruction node with target " + format_value(truncate(val.target, 60)) + " and data " + format_value(truncate(val.data, 60));
                case Node.COMMENT_NODE:
                    return "Comment node <!--" + truncate(val.data, 60) + "-->";
                case Node.DOCUMENT_NODE:
                    return "Document node with " + val.childNodes.length + (val.childNodes.length == 1 ? " child" : " children");
                case Node.DOCUMENT_TYPE_NODE:
                    return "DocumentType node";
                case Node.DOCUMENT_FRAGMENT_NODE:
                    return "DocumentFragment node with " + val.childNodes.length + (val.childNodes.length == 1 ? " child" : " children");
                default:
                    return "Node object of unknown type";
                }
            }

        /* falls through */
        default:
            try {
                return typeof val + ' "' + truncate(String(val), 1000) + '"';
            } catch(e) {
                return ("[stringifying object threw " + String(e) +
                        " with type " + String(typeof e) + "]");
            }
        }
    }
    globalize(format_value)
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
        message || (message = `assertion ${scope.count++}`)
        okay(condition, message)
    }
    globalize(assert_true)
    function assert_false (condition, message) {
        message || (message = `assertion ${scope.count++}`)
        okay(! condition, message)
    }
    globalize(assert_false)
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
                    console.log('has db')
                    const done = new Future
                    dones.push(done)
                    test.db.close()
                    console.log('will delete db')
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

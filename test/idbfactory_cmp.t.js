require('proof')(0, async okay => {
    const assert = require('assert')
    const path = require('path')
    const fs = require('fs').promises
    const directory = path.join(__dirname, 'tmp', 'idbfactory_cmp')
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
    const scope = { name: null, count: 0 }
    function assert_throws_dom(constructor, func, description) {
        try {
        } catch (error) {
            if (error instanceof assert.AssertionError) {
                throw error
            }
        }
        okay.inc(1)
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
            okay(error.constructor === constructor, `${scope.name} - assertion ${scope.count++}`)
            okay.inc(1)
        }
    }
    function test (f, name) {
        scope.name = name
        scope.count = 0
        f()
    }
    const self = {};
    test(function() {
        var greater = window.indexedDB.cmp(2, 1);
        var equal = window.indexedDB.cmp(2, 2);
        var less = window.indexedDB.cmp(1, 2);

        assert_equals(greater, 1, "greater");
        assert_equals(equal, 0, "equal");
        assert_equals(less, -1, "less");
    }, "IDBFactory.cmp()");
})

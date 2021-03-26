require('proof')(0, async okay => {
    const path = require('path')
    const fs = require('fs').promises
    const directory = path.join(__dirname, 'tmp', 'idbfactory_cmp')
    if (fs.rm != null) {
        await fs.rm(directory, { recursive: true, force: true })
    } else {
        await fs.rmdir(directory, { recursive: true })
    }
    await fs.mkdir(directory, { recursive: true })

    const window = {
        indexedDB: require('..').create({ directory })
    }
    function assert_equals (actual, expected, message) {
        okay.inc(1)
        okay(actual, expected, message)
    }
    function test (f, name) {
        okay.say(name)
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

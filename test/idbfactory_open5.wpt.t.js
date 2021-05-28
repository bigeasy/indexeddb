require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbfactory_open5')
    await harness(async function () {
        var open_rq = createdb(async_test(), document.location + '-database_name');

        open_rq.onupgradeneeded = function() {};
        open_rq.onsuccess = function(e) {
            assert_equals(e.target.result.objectStoreNames.length, 0, "objectStoreNames.length");
            this.done();
        };
    })
})

require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbfactory_open4')
    await harness(async function () {
        var open_rq = createdb(async_test(), document.location + '-database_name');

        open_rq.onupgradeneeded = function(e) {
            assert_equals(e.target.result.version, 1, "db.version");
        };
        open_rq.onsuccess = function(e) {
            assert_equals(e.target.result.version, 1, "db.version");
            this.done();
        };
    })
})

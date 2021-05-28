require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbfactory_open3')
    await harness(async function () {
        var open_rq = createdb(async_test(), undefined, 13);
        var did_upgrade = false;

        open_rq.onupgradeneeded = function() {};
        open_rq.onsuccess = function(e) {
            var db = e.target.result;
            db.close();

            var open_rq2 = window.indexedDB.open(db.name);
            open_rq2.onsuccess = this.step_func(function(e) {
                assert_equals(e.target.result.version, 13, "db.version")
                e.target.result.close();
                this.done();
            });
            open_rq2.onupgradeneeded = fail(this, 'Unexpected upgradeneeded')
            open_rq2.onerror = fail(this, 'Unexpected error')
        }
    })
})

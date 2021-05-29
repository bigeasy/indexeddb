require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbfactory_open8')
    await harness(async function () {
        var open_rq = createdb(async_test(), undefined, 13);
        var did_upgrade = false;
        var did_db_abort = false;

        open_rq.onupgradeneeded = function(e) {
            did_upgrade = true;
            e.target.result.onabort = function() {
                did_db_abort = true;
            }
            e.target.transaction.abort();
        };
        open_rq.onerror = function(e) {
            assert_true(did_upgrade);
            assert_equals(e.target.error.name, 'AbortError', 'target.error');
            this.done()
        };
    })
})

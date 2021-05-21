require('proof')(3, async okay => {
    await require('./harness')(okay, 'idbobjectstore_put4')
    await harness(async function () {
        var db,
          record = { key: 1, property: "data" };

        var open_rq = createdb(async_test());
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var objStore = db.createObjectStore("store", { autoIncrement: true });
            objStore.createIndex("i1", "property", { unique: true });
            objStore.put(record);

            var rq = objStore.put(record);
            rq.onsuccess = fail(this, "success on putting duplicate indexed record")

            rq.onerror = this.step_func(function(e) {
                assert_equals(rq.error.name, "ConstraintError");
                assert_equals(e.target.error.name, "ConstraintError");

                assert_equals(e.type, "error");

                e.preventDefault();
                e.stopPropagation();
            });
        };

        // Defer done, giving a spurious rq.onsuccess a chance to run
        open_rq.onsuccess = function(e) {
            this.done();
        }
    })
})

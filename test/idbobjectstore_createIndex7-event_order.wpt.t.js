require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbobjectstore_createIndex7-event_order')
    await harness(async function () {
        // Transaction may fire window.onerror in some implementations.
        setup({allow_uncaught_exception:true});

        var db,
          events = [],
          t = async_test()

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var txn = e.target.transaction;
            db.onerror = log("db.error");
            db.onabort = log("db.abort");
            txn.onabort = log("transaction.abort")
            txn.onerror = log("transaction.error")
            txn.oncomplete = log("transaction.complete")

            var objStore = db.createObjectStore("store");

            var rq_add1 = objStore.add({ animal: "Unicorn" }, 1);
            rq_add1.onsuccess = log("rq_add1.success");
            rq_add1.onerror   = log("rq_add1.error");

            objStore.createIndex("index", "animal", { unique: true })

            var rq_add2 = objStore.add({ animal: "Unicorn" }, 2);
            rq_add2.onsuccess = log("rq_add2.success");
            rq_add2.onerror   = log("rq_add2.error");

            var rq_add3 = objStore.add({ animal: "Horse" }, 3);
            rq_add3.onsuccess = log("rq_add3.success");
            rq_add3.onerror   = log("rq_add3.error");
        }

        open_rq.onerror = function(e) {
            log("open_rq.error")(e);
            assert_array_equals(events, [ "rq_add1.success",

                                          "rq_add2.error: ConstraintError",
                                          "transaction.error: ConstraintError",
                                          "db.error: ConstraintError",

                                          "rq_add3.error: AbortError",
                                          "transaction.error: AbortError",
                                          "db.error: AbortError",

                                          "transaction.abort: ConstraintError",
                                          "db.abort: ConstraintError",

                                          "open_rq.error: AbortError" ],
                                "events");
            t.done();
        }

        function log(msg) {
            return function(e) {
                if(e && e.target && e.target.error)
                    events.push(msg + ": " + e.target.error.name);
                else
                    events.push(msg);
            };
        }
    })
})

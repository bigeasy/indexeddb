require('proof')(10, async okay => {
    await require('./harness')(okay, 'bigint_value')
    await harness(async function () {
        // BigInt and BigInt objects are supported in serialization, per
        // https://github.com/whatwg/html/pull/3480
        // This support allows them to be used as IndexedDB values.

        function value_test(value, predicate, name) {
            async_test(t => {
                t.step(function() {
                    assert_true(predicate(value),
                                "Predicate should return true for the initial value.");
                });

                createdb(t).onupgradeneeded = t.step_func(e => {
                    e.target.result
                            .createObjectStore("store")
                            .add(value, 1);

                    e.target.onsuccess = t.step_func(e => {
                        e.target.result
                                .transaction("store")
                                .objectStore("store")
                                .get(1)
                                .onsuccess = t.step_func(e =>
                        {
                            assert_true(predicate(e.target.result),
                                        "Predicate should return true for the deserialized result.");
                            t.done();
                        });
                    });
                });
            }, "BigInts as values in IndexedDB - " + name);
        }

        value_test(1n,
                   x => x === 1n,
                   "primitive BigInt");
        value_test(Object(1n),
                   x => typeof x === 'object' &&
                        x instanceof BigInt &&
                        x.valueOf() === 1n,
                   "BigInt object");
        value_test({val: 1n},
                   x => x.val === 1n,
                   "primitive BigInt inside object");
        value_test({val: Object(1n)},
                   x => x.val.valueOf() === 1n &&
                        x.val instanceof BigInt &&
                        x.val.valueOf() === 1n,
                   "BigInt object inside object");

        // However, BigInt is not supported as an IndexedDB key; support
        // has been proposed in the following PR, but that change has not
        // landed at the time this patch was written
        // https://github.com/w3c/IndexedDB/pull/231

        function invalidKey(key, name) {
            test(t => {
                assert_throws_dom("DataError", () => indexedDB.cmp(0, key));
            }, "BigInts as keys in IndexedDB - " + name);
        }

        invalidKey(1n, "primitive BigInt");
        // Still an error even if the IndexedDB patch lands
        invalidKey(Object(1n), "BigInt object");
    })
})

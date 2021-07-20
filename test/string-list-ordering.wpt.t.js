require('proof')(5, async okay => {
    await require('./harness')(okay, 'string-list-ordering')
    await harness(async function () {

        var expectedOrder = [
            "",
            "\x00", // 'NULL' (U+0000)
            "0",
            "1",
            "A",
            "B",
            "a",
            "b",
            "\x7F", // 'DELETE' (U+007F)
            "\xC0", // 'LATIN CAPITAL LETTER A WITH GRAVE' (U+00C0)
            "\xC1", // 'LATIN CAPITAL LETTER A WITH ACUTE' (U+00C1)
            "\xE0", // 'LATIN SMALL LETTER A WITH GRAVE' (U+00E0)
            "\xE1", // 'LATIN SMALL LETTER A WITH ACUTE' (U+00E1)
            "\xFF", // 'LATIN SMALL LETTER Y WITH DIAERESIS' (U+00FF)
            "\u0100", // 'LATIN CAPITAL LETTER A WITH MACRON' (U+0100)
            "\u1000", // 'MYANMAR LETTER KA' (U+1000)
            "\uD834\uDD1E", // 'MUSICAL SYMBOL G-CLEF' (U+1D11E), UTF-16 surrogate pairs
            "\uFFFD" // 'REPLACEMENT CHARACTER' (U+FFFD)
        ];

        var i, tmp, permutedOrder = expectedOrder.slice();
        permutedOrder.reverse();
        for (i = 0; i < permutedOrder.length - 2; i += 2) {
            tmp = permutedOrder[i];
            permutedOrder[i] = permutedOrder[i + 1];
            permutedOrder[i + 1] = tmp;
        }

        var objStore, db;
        var t = async_test();

        // Check that the expected order is the canonical JS sort order.
        var sortedOrder = expectedOrder.slice();
        sortedOrder.sort();
        assert_array_equals(sortedOrder, expectedOrder);

        var request = createdb(t);

        request.onupgradeneeded = function(e) {
            db = e.target.result;

            // Object stores.
            for (var i = 0; i < permutedOrder.length; i++) {
                objStore = db.createObjectStore(permutedOrder[i]);
            }
            assert_array_equals(db.objectStoreNames, expectedOrder);

            // Indexes.
            for (var i = 0; i < permutedOrder.length; i++) {
                objStore.createIndex(permutedOrder[i], "keyPath");
            }
            assert_array_equals(objStore.indexNames, expectedOrder);
        };

        request.onsuccess = function(e) {
            // Object stores.
            assert_array_equals(db.objectStoreNames, expectedOrder);
            // Indexes.
            assert_array_equals(objStore.indexNames, expectedOrder);
            t.done();
        };

    })
})

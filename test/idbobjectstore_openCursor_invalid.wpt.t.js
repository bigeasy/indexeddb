require('proof')(3, async okay => {
    await require('./harness')(okay, 'idbobjectstore_openCursor_invalid')
    await harness(async function () {

        indexeddb_test(
          function(t, db, tx) {
                    var objStore = db.createObjectStore("test");
                    objStore.createIndex("index", "");

                    objStore.add("data",  1);
                    objStore.add("data2", 2);
          },
          function(t, db, tx) {
                    var idx = db.transaction("test").objectStore("test").index("index");

                    assert_throws_dom("DataError",
                        function() { idx.openCursor({ lower: "a" }); });

                    assert_throws_dom("DataError",
                        function() { idx.openCursor({ lower: "a", lowerOpen: false }); });

                    assert_throws_dom("DataError",
                        function() { idx.openCursor({ lower: "a", lowerOpen: false, upper: null, upperOpen: false }); });

                    t.done();
          },
          document.title + " - pass something other than number"
        );
    })
})

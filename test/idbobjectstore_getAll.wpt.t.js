require('proof')(17, async okay => {
    await require('./harness')(okay, 'idbobjectstore_getAll')
    await harness(async function () {

        var alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

        function getall_test(func, name) {
          indexeddb_test(
            function(t, connection, tx) {
              var store = connection.createObjectStore('generated',
                    {autoIncrement: true, keyPath: 'id'});
              alphabet.forEach(function(letter) {
                store.put({ch: letter});
              });

              store = connection.createObjectStore('out-of-line', null);
              alphabet.forEach(function(letter) {
                store.put('value-' + letter, letter);
              });

              store = connection.createObjectStore('empty', null);
            },
            func,
            name
          );
        }

        function createGetAllRequest(t, storeName, connection, range, maxCount) {
            var transaction = connection.transaction(storeName, 'readonly');
            var store = transaction.objectStore(storeName);
            var req = store.getAll(range, maxCount);
            req.onerror = t.unreached_func('getAll request should succeed');
            return req;
        }

        getall_test(function(t, connection) {
              var req = createGetAllRequest(t, 'out-of-line', connection, 'c');
              req.onsuccess = t.step_func(function(evt) {
                  assert_array_equals(evt.target.result, ['value-c']);
                  t.done();
              });
            }, 'Single item get');

        getall_test(function(t, connection) {
              var req = createGetAllRequest(t, 'generated', connection, 3);
              req.onsuccess = t.step_func(function(evt) {
                  var data = evt.target.result;
                  assert_true(Array.isArray(data));
                  assert_equals(data.length, 1);
                  assert_equals(data[0].id, 3);
                  assert_equals(data[0].ch, 'c');
                  t.done();
              });
            }, 'Single item get (generated key)');

        getall_test(function(t, connection) {
              var req = createGetAllRequest(t, 'empty', connection);
              req.onsuccess = t.step_func(function(evt) {
                  assert_array_equals(evt.target.result, [],
                      'getAll() on empty object store should return an empty array');
                  t.done();
              });
            }, 'getAll on empty object store');

        getall_test(function(t, connection) {
              var req = createGetAllRequest(t, 'out-of-line', connection);
              req.onsuccess = t.step_func(function(evt) {
                  assert_array_equals(evt.target.result,
                      alphabet.map(function(c) { return 'value-' + c; }));
                  t.done();
              });
            }, 'Get all values');

        getall_test(function(t, connection) {
              var req = createGetAllRequest(t, 'out-of-line', connection, undefined,
                                            10);
              req.onsuccess = t.step_func(function(evt) {
                  assert_array_equals(evt.target.result,
                      'abcdefghij'.split('').map(function(c) { return 'value-' + c; }));
                  t.done();
              });
            }, 'Test maxCount');

        getall_test(function(t, connection) {
              var req = createGetAllRequest(t, 'out-of-line', connection,
                                            IDBKeyRange.bound('g', 'm'));
              req.onsuccess = t.step_func(function(evt) {
                  assert_array_equals(evt.target.result,
                      'ghijklm'.split('').map(function(c) { return 'value-' + c; }));
                  t.done();
              });
            }, 'Get bound range');

        getall_test(function(t, connection) {
              var req = createGetAllRequest(t, 'out-of-line', connection,
                                            IDBKeyRange.bound('g', 'm'), 3);
              req.onsuccess = t.step_func(function(evt) {
                  assert_array_equals(evt.target.result, ['g', 'h', 'i']
                      .map(function(c) { return 'value-' + c; }));
                  t.done();
              });
            }, 'Get bound range with maxCount');

        getall_test(function(t, connection) {
              var req = createGetAllRequest(t, 'out-of-line', connection,
                                            IDBKeyRange.bound('g', 'k', false, true));
              req.onsuccess = t.step_func(function(evt) {
                  assert_array_equals(evt.target.result, ['g', 'h', 'i', 'j']
                      .map(function(c) { return 'value-' + c; }));
                  t.done();
              });
            }, 'Get upper excluded');

        getall_test(function(t, connection) {
              var req = createGetAllRequest(t, 'out-of-line', connection,
                                            IDBKeyRange.bound('g', 'k', true, false));
              req.onsuccess = t.step_func(function(evt) {
                  assert_array_equals(evt.target.result, ['h', 'i', 'j', 'k']
                      .map(function(c) { return 'value-' + c; }));
                  t.done();
              });
            }, 'Get lower excluded');

        getall_test(function(t, connection) {
              var req = createGetAllRequest(t, 'generated', connection,
                                            IDBKeyRange.bound(4, 15), 3);
              req.onsuccess = t.step_func(function(evt) {
                  var data = evt.target.result;
                  assert_true(Array.isArray(data));
                  assert_array_equals(data.map(function(e) { return e.ch; }), ['d', 'e', 'f']);
                  assert_array_equals(data.map(function(e) { return e.id; }), [4, 5, 6]);
                  t.done();
              });
            }, 'Get bound range (generated) with maxCount');

        getall_test(function(t, connection) {
              var req = createGetAllRequest(t, 'out-of-line', connection,
                                            "Doesn't exist");
              req.onsuccess = t.step_func(function(evt) {
                  assert_array_equals(evt.target.result, [],
                      'getAll() using a nonexistent key should return an empty array');
                  t.done();
              });
              req.onerror = t.unreached_func('getAll request should succeed');
            }, 'Non existent key');

        getall_test(function(t, connection) {
              var req = createGetAllRequest(t, 'out-of-line', connection, undefined, 0);
              req.onsuccess = t.step_func(function(evt) {
                  assert_array_equals(evt.target.result,
                      alphabet.map(function(c) { return 'value-' + c; }));
                  t.done();
              });
            }, 'zero maxCount');

    })
})

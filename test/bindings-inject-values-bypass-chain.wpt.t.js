require('proof')(11, async okay => {
    await require('./harness')(okay, 'bindings-inject-values-bypass-chain')
    await harness(async function () {

        promise_test(async t => {
          const db = await createDatabase(t, db => {
            db.createObjectStore('store', {autoIncrement: true, keyPath: 'a.b.c'});
          });

          Object.prototype.a = {b: {c: 'on proto'}};
          t.add_cleanup(() => { delete Object.prototype.a; });

          const tx = db.transaction('store', 'readwrite');
          tx.objectStore('store').put({});
          const result = await promiseForRequest(t, tx.objectStore('store').get(1));

          assert_true(result.hasOwnProperty('a'),
                      'Result should have own-properties overriding prototype.');
          assert_true(result.a.hasOwnProperty('b'),
                      'Result should have own-properties overriding prototype.');
          assert_true(result.a.b.hasOwnProperty('c'),
                      'Result should have own-properties overriding prototype.');
          assert_equals(result.a.b.c, 1,
                        'Own property should match primary key generator value');
          assert_equals(Object.prototype.a.b.c, 'on proto',
                        'Prototype should not be modified');
        }, 'Returning values to script should bypass prototype chain');

    })
})

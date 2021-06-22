require('proof')(6, async okay => {
    await require('./harness')(okay, 'upgrade-transaction-deactivation-timing')
    await harness(async function () {

        indexeddb_test(
          (t, db, tx) => {
            db.createObjectStore('store');
            assert_true(is_transaction_active(tx, 'store'),
                        'Transaction should be active in upgradeneeded callback');
          },
          (t, db) => { t.done(); },
          'Upgrade transactions are active in upgradeneeded callback');

        indexeddb_test(
          (t, db, tx) => {
            db.createObjectStore('store');
            assert_true(is_transaction_active(tx, 'store'),
                        'Transaction should be active in upgradeneeded callback');

            Promise.resolve().then(t.step_func(() => {
              assert_true(is_transaction_active(tx, 'store'),
                          'Transaction should be active in microtask checkpoint');
            }));
          },
          (t, db) => { t.done(); },
          'Upgrade transactions are active in upgradeneeded callback and microtasks');


        indexeddb_test(
          (t, db, tx) => {
            db.createObjectStore('store');
            const release_tx = keep_alive(tx, 'store');

            setTimeout(t.step_func(() => {
              assert_false(is_transaction_active(tx, 'store'),
                           'Transaction should be inactive in next task');
              release_tx();
            }), 0);
          },
          (t, db) => { t.done(); },
          'Upgrade transactions are deactivated before next task');

    })
})

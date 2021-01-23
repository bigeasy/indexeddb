// [![Actions Status](https://github.com/bigeasy/indexeddb/workflows/Node%20CI/badge.svg)](https://github.com/bigeasy/indexeddb/actions)
// [![codecov](https://codecov.io/gh/bigeasy/indexeddb/branch/master/graph/badge.svg)](https://codecov.io/gh/bigeasy/indexeddb)
// [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
//
// A pure-JavaScript, persistent implementation of IndexedDB.
//
// | What          | Where                                         |
// | --- | --- |
// | Discussion    | https://github.com/bigeasy/indexeddb/issues/1 |
// | Documentation | https://bigeasy.github.io/indexeddb           |
// | Source        | https://github.com/bigeasy/indexeddb          |
// | Issues        | https://github.com/bigeasy/indexeddb/issues   |
// | CI            | https://travis-ci.org/bigeasy/indexeddb       |
// | Coverage:     | https://codecov.io/gh/bigeasy/indexeddb       |
// | License:      | MIT                                           |
//
//
// IndexedDB installs from NPM.

// This `README.md` is also a unit test using the
// [Proof](https://github.com/bigeasy/proof) unit test framework. We'll use the
// Proof `okay` function to assert out statements in the readme. A Proof unit test
// generally looks like this.

require('proof')(4, async okay => {
    okay('always okay')
    okay(true, 'okay if true')
    okay(1, 1, 'okay if equal')
    okay({ value: 1 }, { value: 1 }, 'okay if deep strict equal')
})

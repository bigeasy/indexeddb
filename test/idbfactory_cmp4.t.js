require('proof')(0, async okay => {
    const assert = require('assert')
    const path = require('path')
    const fs = require('fs').promises
    const directory = path.join(__dirname, 'tmp', 'idbfactory_cmp4')
    if (fs.rm != null) {
        await fs.rm(directory, { recursive: true, force: true })
    } else {
        await fs.rmdir(directory, { recursive: true })
    }
    await fs.mkdir(directory, { recursive: true })

    const indexedDB = require('..').create({ directory })
    const window = { indexedDB }
    function assert_equals (actual, expected, message) {
        okay.inc(1)
        okay(actual, expected, message)
    }
    const scope = { name: null, count: 0 }
    function assert_throws_dom(type, func, description) {
        try {
            func.call(null)
        } catch (error) {
            if (error instanceof assert.AssertionError) {
                throw error
            }
            const names = {
                INDEX_SIZE_ERR: 'IndexSizeError',
                HIERARCHY_REQUEST_ERR: 'HierarchyRequestError',
                WRONG_DOCUMENT_ERR: 'WrongDocumentError',
                INVALID_CHARACTER_ERR: 'InvalidCharacterError',
                NO_MODIFICATION_ALLOWED_ERR: 'NoModificationAllowedError',
                NOT_FOUND_ERR: 'NotFoundError',
                NOT_SUPPORTED_ERR: 'NotSupportedError',
                INUSE_ATTRIBUTE_ERR: 'InUseAttributeError',
                INVALID_STATE_ERR: 'InvalidStateError',
                SYNTAX_ERR: 'SyntaxError',
                INVALID_MODIFICATION_ERR: 'InvalidModificationError',
                NAMESPACE_ERR: 'NamespaceError',
                INVALID_ACCESS_ERR: 'InvalidAccessError',
                TYPE_MISMATCH_ERR: 'TypeMismatchError',
                SECURITY_ERR: 'SecurityError',
                NETWORK_ERR: 'NetworkError',
                ABORT_ERR: 'AbortError',
                URL_MISMATCH_ERR: 'URLMismatchError',
                QUOTA_EXCEEDED_ERR: 'QuotaExceededError',
                TIMEOUT_ERR: 'TimeoutError',
                INVALID_NODE_TYPE_ERR: 'InvalidNodeTypeError',
                DATA_CLONE_ERR: 'DataCloneError'
            }

            const codes = {
                IndexSizeError: 1,
                HierarchyRequestError: 3,
                WrongDocumentError: 4,
                InvalidCharacterError: 5,
                NoModificationAllowedError: 7,
                NotFoundError: 8,
                NotSupportedError: 9,
                InUseAttributeError: 10,
                InvalidStateError: 11,
                SyntaxError: 12,
                InvalidModificationError: 13,
                NamespaceError: 14,
                InvalidAccessError: 15,
                TypeMismatchError: 17,
                SecurityError: 18,
                NetworkError: 19,
                AbortError: 20,
                URLMismatchError: 21,
                QuotaExceededError: 22,
                TimeoutError: 23,
                InvalidNodeTypeError: 24,
                DataCloneError: 25,

                EncodingError: 0,
                NotReadableError: 0,
                UnknownError: 0,
                ConstraintError: 0,
                DataError: 0,
                TransactionInactiveError: 0,
                ReadOnlyError: 0,
                VersionError: 0,
                OperationError: 0,
                NotAllowedError: 0
            }

            const codeNames = {}

            for (const key in codes) {
                codeNames[codes[key]] = key
            }

            okay({
                name: error.name,
                code: error.code
            }, {
                name: type,
                code: codes[type],
            }, `${scope.name} - assertion ${scope.count++}`)

            if (typeof type == 'number') {
                throw new Error
            } else {
                const name = type in codes ? codes[type] : type
            }
            okay.inc(1)
        }
    }
    function assert_throws_js(constructor, func, description) {
        try {
            func.call(null)
            assert(false, 'did not throw')
        } catch (error) {
            if (error instanceof assert.AssertionError) {
                throw error
            }
            if (error.constructor !== constructor) {
                console.log(error.stack)
            }
            okay(error.constructor === constructor, `${scope.name} - assertion ${scope.count++}`)
            okay.inc(1)
        }
    }
    const self = {}
    function test (f, name) {
        scope.name = name
        scope.count = 0
        f()
    }
    test(function() {
      assert_equals(indexedDB.cmp(new Int8Array([-1]), new Uint8Array([0])), 1,
      "255(-1) shall be larger than 0");
    }, "Compare in unsigned octet values (in the range [0, 255])");

    test(function() {
      assert_equals(indexedDB.cmp(
          new Uint8Array([255, 254, 253]),
          new Uint8Array([255, 253, 254])),
          1,
          "[255, 254, 253] shall be larger than [255, 253, 254]");
    }, "Compare values in then same length");

    test(function() {
      assert_equals(indexedDB.cmp(
          new Uint8Array([255, 254]),
          new Uint8Array([255, 253, 254])),
          1,
          "[255, 254] shall be larger than [255, 253, 254]");
    }, "Compare values in different lengths");

    test(function() {
      assert_equals(indexedDB.cmp(
          new Uint8Array([255, 253, 254]),
          new Uint8Array([255, 253])),
          1,
          "[255, 253, 254] shall be larger than [255, 253]");
    }, "Compare when the values in the range of their minimal length are the same");
})

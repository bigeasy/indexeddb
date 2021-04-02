module.exports = async function (okay, name) {
    const fs = require('fs').promises
    const assert = require('assert')
    const path = require('path')
    const rmrf = require('../rmrf')
    const directory = path.join(__dirname, 'tmp', name)
    await rmrf(process.version, fs, directory)
    await fs.mkdir(directory, { recursive: true })
    class Test {
    }
    globalize(Test)
    const indexedDB = require('..').create({ directory })
    globalize(indexedDB, 'indexedDB')
    globalize({ indexedDB }, 'window')
    const scope = {}
    function globalize (value, name = null) {
        if (name == null) {
            switch (typeof value) {
            case 'function':
                global[value.name] = value
                okay.leak(value.name)
            }
        } else {
            global[name] = value
            okay.leak(name)
        }
    }
    function test (f, name) {
        scope.name = name
        scope.count = 0
        f()
    }
    globalize(test)
    function assert_equals (actual, expected, message) {
        okay.inc(1)
        okay(actual, expected, `${scope.name} - assertion ${scope.count++}`)
    }
    globalize(assert_equals)
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
    globalize(assert_throws_js)
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
    globalize(assert_throws_dom)
}

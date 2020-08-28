require('proof')(1, prove)

function prove (ok) {
    ok(require('..'), 'require')
}

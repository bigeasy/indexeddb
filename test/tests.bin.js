#!/usr/bin/env node
/*

    ___ usage ___ en_US ___
    node highlight.bin.js <options> [sockets directory, sockets directory...]

    options:

        --help

            display help message

        --mode <string>

            generator mode, 'text' or 'code', default 'text'.

    ___ $ ___ en_US ___

        select is required:
            the `--select` argument is a required argument

        language is required:
            the `--language` argument is a required argument
    ___ . ___

 */
require('arguable')(module, async arguable => {
    const util = require('util')
    const fs = require('fs').promises
    const path = require('path')
    const cheerio = require('cheerio')
    const test = arguable.argv[0]
    const source = await fs.readFile(test, 'utf8')
    const $_ = require('programmatic')
    const includes = [], blocks = []
    if (test.match(/\.any\.js$/)) {
        blocks.push(source)
    } else {
        const $ = cheerio.load(source)
        $('script').each(function () {
            const src = this.attribs.src
            if (src == null) {
                blocks.push($_($(this).html()))
            } else {
                includes.push(src)
            }
        })
    }
    const dir = path.dirname(test)
    const sources = []
    for (const block of blocks) {
        sources.push(block)
    }
    const count = (sources.join('\n').match(/(?:assert_throws_dom|assert_(?:not_|object_)?equals|assert_true|assert_false|assert_array_equals|assert_key_equals|assert_readonly|assert_throws_js)/g) || []).length
    const name = path.basename(test).replace(/(?:.html?|(?:\.tentative)?\.any\.js)$/, '')
    console.log(path.resolve(__dirname, `${name}.wpt.t.js`))
    await fs.writeFile(path.resolve(__dirname, `${name}.wpt.t.js`), $_(`
        require('proof')(${count}, async okay => {
            await require('./harness')(okay, ${util.inspect(name)})
            await harness(async function () {
                `, sources.join('\n'), `
            })
        })
    `) + '\n')
})

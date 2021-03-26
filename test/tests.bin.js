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
    const $ = cheerio.load(source)
    const $_ = require('programmatic')
    const includes = [], blocks = []
    $('script').each(function () {
        const src = this.attribs.src
        if (src == null) {
            blocks.push($_($(this).html()))
        } else {
            includes.push(src)
        }
    })
    const dir = path.dirname(test)
    const sources = []
    for (const include of includes) {
        const file = path.resolve(dir, path.isAbsolute(include) ? `..${include}` : include)
        // sources.push(await fs.readFile(file, 'utf8'))
    }
    for (const block of blocks) {
        sources.push(block)
    }
    const name = path.basename(test, '.htm')
    await fs.writeFile(path.resolve(__dirname, `${name}.t.js`), $_(`
        require('proof')(0, async okay => {
            const path = require('path')
            const fs = require('fs').promises
            const directory = path.join(__dirname, 'tmp', ${util.inspect(name)})
            if (fs.rm != null) {
                await fs.rm(directory, { recursive: true, force: true })
            } else {
                await fs.rmdir(directory, { recursive: true })
            }
            await fs.mkdir(directory, { recursive: true })

            const window = {
                indexedDB: require('..').create({ directory })
            }
            function assert_equals (actual, expected, message) {
                okay.inc(1)
                okay(actual, expected, message)
            }
            function test (f, name) {
                okay.say(name)
                f()
            }
            const self = {};
            `, sources.join('\n'), `
        })
    `) + '\n')
})

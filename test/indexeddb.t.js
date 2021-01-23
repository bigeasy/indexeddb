require('proof')(2, async okay => {
    const Future = require('perhaps')

    const fs = require('fs').promises
    const path = require('path')

    const directory = path.join(__dirname, 'tmp', 'indexeddb')

    await fs.rmdir(directory, { recursive: true })
    await fs.mkdir(directory, { recursive: true })

    const indexedDB = require('..').create({ directory })

    const chairs = `
        Thomas Neal 11/19/1912 11/16/1915 ON
        Pierre S. du Pont 11/16/1915  2/7/1929 DE
        Lammot du Pont II 2/7/1929 5/3/1937 DE
        Alfred P. Sloan Jr. 5/3/1937 4/2/1956 CT
        Albert Bradley 4/2/1956 8/31/1958 UK
        Frederic G. Donner 9/1/1958 10/31/1967 MI
        James M. Roche 11/1/1967 12/31/1971 IL
        Richard C. Gerstenberg 1/1/1972 11/30/1974 NY
        Thomas A. Murphy 12/1/1974 12/31/1980 NY
        Roger B. Smith 1/1/1981 7/31/1990 OH
        Robert C. Stempel 8/1/1990 11/1/1992 NJ
        John G. Smale 11/2/1992 11/31/1995 ON
        Jack F. Smith Jr. 11/1/1996 4/30/2003 MA
        Richard Wagoner Jr. 5/1/2003 3/30/2009 DE
        Kent Kresa 3/30/2009 7/10/2009 NY
        Edward Whitacre Jr. 7/10/2009 12/31/2010 TX
        Dan Akerson 12/31/2010 1/15/2014 CA
        Tim Solso 1/15/2014 1/4/2016 WA
        Mary Barra 1/4/2016 Present MI
    `.trim().split('\n').map((line, index) => {
        let [ _, firstName, lastName, start, end, born ] = /(\S+)\s+(.*)\s+(\S+)\s+(\S+)\s+(\S+)/.exec(line)
        let $ = /(\S)\.\s+(.*)/.exec(lastName)
        let middleInitial = null
        if ($ != null) {
            middleInitial = $[1]
            lastName = $[2]
        }
        let suffix = null
        $ = /(.*)\s+(II|Jr)/.exec(lastName)
        if ($ != null) {
            lastName = $[1]
            suffix = $[2]
        }
        return {
            order: index + 1,
            firstName, middleInitial, lastName, suffix,
            start: new Date(start),
            end: end == 'Present' ? null : new Date(end),
            born
        }
    })

    const locations = `
        CA California
        CT Connecticut
        DE Deleware
        IL Illinois
        MA Massachusetts
        MI Michigan
        NJ New Jersy
        NY New York
        OH Ohio
        ON Ontario
        TX Texas
        UK United Kingdom
        WA Washington
    `.trim().split('\n').map(location => {
        const [ _, abbrev, name ] = /(\S{2})\s+(.*)/.exec(location)
        return { abbrev, name }
    })

    okay(indexedDB, 'required')

    const request = indexedDB.open('test', 3)
    const future = new Future

    request.onupgradeneeded = function () {
        okay(request.readyState, 'done', 'on upgrade done')
        const db = request.result
        const store = db.createObjectStore('chair', { keyPath: 'order' })
        // store.createIndex('by_title', 'title', { unique: true })

        console.log('here')
        store.put(chairs[0])
        console.log('here')
        store.put(chairs[1])
        store.put(chairs[2])
    }

    request.onsuccess = function () {
        console.log('succeeded', !! request.result)
        future.resolve()
    }

    console.log('awaiting')
    await future.promise
    console.log('done ?')
})

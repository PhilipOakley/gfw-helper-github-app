(async () => {
    const fs = require('fs')

    // Expect a path as command-line parameter that points to a file containing
    // an event copy/pasted from
    // https://github.com/settings/apps/gitforwindowshelper/advanced in the form:
    //
    // Headers
    //
    // Request method: POST
    // [...]
    //
    // Payload
    //
    // {
    //    [...]
    // }

    const path = process.argv[2]
    const contents = fs.readFileSync(path).toString('utf-8')

    const req = {
        headers: {}
    }

    const payloadOffset = contents.indexOf('\n{')
    if (payloadOffset < 0) throw new Error(`Could not find start of payload in ${path}`)
    contents.substring(0, payloadOffset).split(/\r?\n/).forEach(line => {
        const colon = line.indexOf(':')
        if (colon < 0) return

        const key = line.substring(0, colon).toLowerCase()
        const value = line.substring(colon + 1).replace(/^\s+/, '')

        if (key === 'request method') req.method = value
        else req.headers[key] = value
    })
    req.rawBody = contents.substring(payloadOffset + 1)
        // In https://github.com/settings/apps/gitforwindowshelper/advanced, the
        // JSON is pretty-printed, but the actual webhook event avoids any
        // unnecessary white-space in the body
        .replace(/\r?\n\s*("[^"]*":)\s*/g, '$1')
        .replace(/\r?\n\s*/g, '')
    req.body = JSON.parse(req.rawBody)

    const context = {
        log: console.log,
        req,
    }

    const localSettings = JSON.parse(fs.readFileSync('local.settings.json'))
    Object.entries(localSettings.Values).forEach(([key, value]) => process.env[key] = value)

    const index = require('./GitForWindowsHelper/index')
    console.log(await index(context, req) || context.res)
})().catch(console.log)
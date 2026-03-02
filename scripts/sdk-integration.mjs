// ---------------------------------------------------------------------------
// Start the Dealflow HTTP test server and run the SDK integration tests.
//
// Usage:  node scripts/sdk-integration.mjs
// ---------------------------------------------------------------------------

import http from 'node:http'
import { seedMemoryStore, memoryStore } from '../dist/lib/store/in-memory.js'
import { GET as getDeals, POST as postDeals } from '../dist/app/api/v1/deals/route.js'
import { GET as getDeal } from '../dist/app/api/v1/deals/[dealId]/route.js'
import { POST as postAction } from '../dist/app/api/v1/deals/[dealId]/actions/route.js'
import { GET as getDealHistory } from '../dist/app/api/v1/deals/[dealId]/history/route.js'
import { GET as getDealOffers } from '../dist/app/api/v1/deals/[dealId]/offers/route.js'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const { apiKey } = seedMemoryStore()
const port = 4011

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
    const chunks = []
    for await (const c of req) chunks.push(c)
    const body = chunks.length ? Buffer.concat(chunks).toString('utf8') : undefined

    const request = new Request(url.toString(), { method: req.method, headers: req.headers, body })

    let response
    if (url.pathname === '/api/v1/deals' && req.method === 'POST') response = await postDeals(request)
    else if (url.pathname === '/api/v1/deals' && req.method === 'GET') response = await getDeals(request)
    else if (url.pathname.match(/^\/api\/v1\/deals\/[^/]+$/) && req.method === 'GET') response = await getDeal(request, { params: { dealId: url.pathname.split('/').pop() } })
    else if (url.pathname.match(/^\/api\/v1\/deals\/[^/]+\/actions$/) && req.method === 'POST') response = await postAction(request, { params: { dealId: url.pathname.split('/')[4] } })
    else if (url.pathname.match(/^\/api\/v1\/deals\/[^/]+\/history$/) && req.method === 'GET') response = await getDealHistory(request, { params: { dealId: url.pathname.split('/')[4] } })
    else if (url.pathname.match(/^\/api\/v1\/deals\/[^/]+\/offers$/) && req.method === 'GET') response = await getDealOffers(request, { params: { dealId: url.pathname.split('/')[4] } })
    else response = new Response(JSON.stringify({ error: 'Not found', code: 'DEAL_NOT_FOUND', status: 404 }), { status: 404, headers: { 'content-type': 'application/json' } })

    res.statusCode = response.status
    response.headers.forEach((value, key) => res.setHeader(key, value))
    res.end(await response.text())
})

await new Promise((resolve) => server.listen(port, resolve))
console.log(`Test server running on http://127.0.0.1:${port} (API key: ${apiKey.substring(0, 12)}...)`)

// Run the SDK integration test
const sdkDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'packages', '@dealflow', 'sdk')
const testFile = path.resolve(sdkDir, 'src', '__tests__', 'integration.test.mjs')

const child = spawn(process.execPath, [testFile], {
    cwd: sdkDir,
    env: {
        ...process.env,
        DEALFLOW_TEST_API_KEY: apiKey,
        DEALFLOW_TEST_BASE_URL: `http://127.0.0.1:${port}`,
    },
    stdio: 'inherit',
})

child.on('close', (code) => {
    server.close()
    process.exit(code ?? 0)
})

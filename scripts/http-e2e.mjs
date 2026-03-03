import http from 'node:http'
import assert from 'node:assert/strict'
import { seedMemoryStore, memoryStore } from '../lib/store/in-memory.ts'
import { GET as getDeals, POST as postDeals } from '../app/api/v1/deals/route.ts'
import { GET as getDeal } from '../app/api/v1/deals/[dealId]/route.ts'
import { POST as postAction } from '../app/api/v1/deals/[dealId]/actions/route.ts'
import { GET as getDashboard } from '../app/api/v1/dashboard/route.ts'

const { apiKey } = seedMemoryStore()
const port = 4010

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
  const chunks = []
  for await (const c of req) chunks.push(c)
  const body = chunks.length ? Buffer.concat(chunks).toString('utf8') : undefined

  const request = new Request(url.toString(), { method: req.method, headers: req.headers, body })

  let response
  if (url.pathname === '/api/v1/deals' && req.method === 'POST') response = await postDeals(request)
  else if (url.pathname === '/api/v1/deals' && req.method === 'GET') response = await getDeals(request)
  else if (url.pathname === '/api/v1/dashboard' && req.method === 'GET') response = await getDashboard(request)
  else if (url.pathname.match(/^\/api\/v1\/deals\/[^/]+$/) && req.method === 'GET') response = await getDeal(request, { params: { dealId: url.pathname.split('/').pop() } })
  else if (url.pathname.match(/^\/api\/v1\/deals\/[^/]+\/actions$/) && req.method === 'POST') response = await postAction(request, { params: { dealId: url.pathname.split('/')[4] } })
  else response = new Response(JSON.stringify({ error: 'Not found', code: 'DEAL_NOT_FOUND', status: 404 }), { status: 404, headers: { 'content-type': 'application/json' } })

  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.end(await response.text())
})

await new Promise((resolve) => server.listen(port, resolve))

const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
const hasRealGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here')

// 1) Create deal with constraints
const created = await fetch(`http://127.0.0.1:${port}/api/v1/deals`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ type: 'negotiation', intent: 'Procure 200 units bearings', constraints: { budget_max: 5000, budget_min: 3500, currency: 'USD', deadline } }),
})
assert.equal(created.status, 201)
const createdBody = await created.json()
const dealId = createdBody.deal.id

// 2) summary non-empty
assert.equal(typeof createdBody.deal.current_summary, 'string')
assert.equal(createdBody.deal.current_summary.length > 0, true)

// 3) offer 4200 updates summary
const offer4200 = await fetch(`http://127.0.0.1:${port}/api/v1/deals/${dealId}/actions`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ action: 'offer', actor: 'buyer-agent', payload: { price: 4200, currency: 'USD' } }),
})
assert.equal(offer4200.status, 200)
const offer4200Body = await offer4200.json()
if (hasRealGroq) {
  assert.equal(offer4200Body.deal.current_summary.includes('4200') || offer4200Body.deal.current_summary.includes('4,200'), true)
} else {
  assert.equal(offer4200Body.deal.current_summary.length > 0, true)
}

// 4) offer 3200 => price_floor_violated + summary mention
const offer3200 = await fetch(`http://127.0.0.1:${port}/api/v1/deals/${dealId}/actions`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ action: 'offer', actor: 'buyer-agent', payload: { price: 3200, currency: 'USD' } }),
})
assert.equal(offer3200.status, 200)
const offer3200Body = await offer3200.json()
assert.equal(offer3200Body.deal.compliance_flags.some((f) => f.type === 'price_floor_violated' && f.severity === 'critical'), true)
assert.equal(offer3200Body.deal.current_summary.includes('compliance') || offer3200Body.deal.current_summary.includes('flag'), true)

// 5) offer 5200 => over_budget critical
const offer5200 = await fetch(`http://127.0.0.1:${port}/api/v1/deals/${dealId}/actions`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ action: 'offer', actor: 'buyer-agent', payload: { price: 5200, currency: 'USD' } }),
})
assert.equal(offer5200.status, 200)
const offer5200Body = await offer5200.json()
assert.equal(offer5200Body.deal.compliance_flags.some((f) => f.type === 'over_budget' && f.severity === 'critical'), true)

// 6) resume in fresh context
const resumed = await fetch(`http://127.0.0.1:${port}/api/v1/deals/${dealId}`, { headers })
assert.equal(resumed.status, 200)
const resumedBody = await resumed.json()
assert.equal(typeof resumedBody.deal.current_summary, 'string')
assert.equal(resumedBody.deal.current_summary.length > 0, true)

const dashboard = await fetch(`http://127.0.0.1:${port}/api/v1/dashboard`, { headers })
assert.equal(dashboard.status, 200)
const dashboardBody = await dashboard.json()
assert.equal(typeof dashboardBody.totals, 'object')
assert.equal(dashboardBody.totals.deals >= 1, true)
assert.equal(Array.isArray(dashboardBody.recent_deals), true)

// fallback test with invalid groq key should still return summary
const prevGroq = process.env.GROQ_API_KEY
process.env.GROQ_API_KEY = ''
const offerFallback = await fetch(`http://127.0.0.1:${port}/api/v1/deals/${dealId}/actions`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ action: 'note', actor: 'buyer-agent', payload: { content: 'trigger fallback' } }),
})
assert.equal(offerFallback.status, 200)
const fallbackBody = await offerFallback.json()
assert.equal(typeof fallbackBody.deal.current_summary, 'string')
assert.equal(fallbackBody.deal.current_summary.length > 0, true)
if (prevGroq !== undefined) process.env.GROQ_API_KEY = prevGroq

const unauthorized = await fetch(`http://127.0.0.1:${port}/api/v1/deals`)
assert.equal(unauthorized.status, 401)
const unauthorizedBody = await unauthorized.json()
assert.deepEqual(unauthorizedBody, {
  error: 'Invalid or missing API key',
  code: 'INVALID_API_KEY',
  status: 401,
})

const invalidFilter = await fetch(`http://127.0.0.1:${port}/api/v1/deals?created_after=not-a-date`, { headers })
assert.equal(invalidFilter.status, 422)
const invalidFilterBody = await invalidFilter.json()
assert.equal(invalidFilterBody.code, 'VALIDATION_ERROR')

console.log('HTTP e2e passed', { dealId, totalDeals: memoryStore.deals.length })
server.close()

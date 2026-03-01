import http from 'node:http'
import { seedMemoryStore } from '../dist/lib/store/in-memory.js'
import { GET as getDeals, POST as postDeals } from '../dist/app/api/v1/deals/route.js'
import { GET as getDeal } from '../dist/app/api/v1/deals/[dealId]/route.js'
import { POST as postAction } from '../dist/app/api/v1/deals/[dealId]/actions/route.js'

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
  else if (url.pathname.match(/^\/api\/v1\/deals\/[^/]+$/) && req.method === 'GET') {
    response = await getDeal(request, { params: { dealId: url.pathname.split('/').pop() } })
  } else if (url.pathname.match(/^\/api\/v1\/deals\/[^/]+\/actions$/) && req.method === 'POST') {
    response = await postAction(request, { params: { dealId: url.pathname.split('/')[4] } })
  } else response = new Response(JSON.stringify({ error: 'Not found', code: 'DEAL_NOT_FOUND', status: 404 }), { status: 404, headers: { 'content-type': 'application/json' } })

  res.statusCode = response.status
  response.headers.forEach((v, k) => res.setHeader(k, v))
  res.end(await response.text())
})

server.listen(port, () => {
  console.log(JSON.stringify({ port, apiKey }))
})

setTimeout(() => server.close(), 30000)

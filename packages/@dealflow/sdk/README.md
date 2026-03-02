# @dealflow/sdk

[![npm version](https://img.shields.io/npm/v/@dealflow/sdk.svg)](https://www.npmjs.com/package/@dealflow/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://www.typescriptlang.org/)

**The commerce intelligence layer for AI agents.** Give your agents persistent, structured deal state with automatic compliance checking, AI-powered summaries, and a full immutable event log.

```
npm install @dealflow/sdk
```

## Quick Start

```typescript
import { Dealflow } from '@dealflow/sdk'

const df = new Dealflow({ apiKey: 'df_live_...' })

// ── Session 1: Create a deal ──────────────────────────────────────
const deal = await df.deals.create({
  type: 'negotiation',
  intent: 'Purchase 200 precision bearings',
  parties: [
    { id: 'buyer-agent', role: 'buyer', type: 'agent' },
    { id: 'supplier-agent', role: 'seller', type: 'agent' },
  ],
  constraints: {
    budget_max: 5000,
    budget_min: 3500,
    currency: 'USD',
    requirements: ['ISO_9001'],
  },
})

console.log(deal.summary)
// → "Negotiation deal for: Purchase 200 precision bearings. Deal is active..."

// ── Session 2: Make an offer ──────────────────────────────────────
await deal.offer({
  price: 4200,
  currency: 'USD',
  conditions: ['ISO_9001'],
  actor: 'buyer-agent',
})

console.log(deal.pendingOffers.length) // → 1
console.log(deal.hasComplianceIssues)  // → false

// ── Imagine the agent crashed here ────────────────────────────────
// The deal persists on the server. A new agent can pick it up.

// ── Session 3: Resume from anywhere ───────────────────────────────
const df2 = new Dealflow({ apiKey: 'df_live_...' })
const resumed = await df2.deals.resume(deal.id)

console.log(resumed.summary)          // Full context — no state lost
console.log(resumed.pendingOffers)     // Offers are still there

// ── Session 4: Escalate ───────────────────────────────────────────
await resumed.escalate({
  to: 'supplier-agent',
  reason: 'Need final confirmation on ISO compliance',
  actor: 'buyer-agent',
})

console.log(resumed.status) // → 'escalated'

// ── Session 5: Accept the offer ───────────────────────────────────
const bestOffer = resumed.pendingOffers[0]
await resumed.accept({
  offer_id: bestOffer.id,
  actor: 'supplier-agent',
})

// ── Session 6: Close the deal ─────────────────────────────────────
await resumed.close({
  outcome: 'completed',
  final_value: 4200,
  final_currency: 'USD',
  actor: 'supplier-agent',
})

console.log(resumed.isClosed)   // → true
console.log(resumed.outcome)    // → 'completed'
console.log(resumed.durationMs) // → milliseconds the deal took
```

## Core Concepts

### Deals

A **Deal** is a structured commerce process — a negotiation, procurement, return, or sale. Every deal has an intent (what you're trying to accomplish), constraints (budget, deadline, requirements), parties (agents and humans involved), and a full lifecycle managed through typed actions. The SDK wraps the raw API data in a `Deal` class that updates itself after every action — you never have to manually refetch state.

### The Event Log

Every action taken on a deal is recorded as an immutable **DealEvent**. This log gives your agents complete causal history: who did what, when, and what the deal looked like before and after. When an agent resumes a deal, the event log is how it reconstructs full context. You can access it via `deal.history`.

### Intelligence Layer

Dealflow automatically provides three intelligence features on every deal:
- **Summaries** — human-readable briefings generated after every action, designed to bring any agent up to speed immediately (`deal.summary`)
- **Compliance** — automatic checking of budget ceilings, price floors, missing requirements, and deadline violations (`deal.compliance_flags`)
- **Best Offer** — real-time computation of the optimal offer given the deal's constraints (`deal.bestOffer`)

## API Reference

### Creating & Resuming Deals

```typescript
const df = new Dealflow({ apiKey: 'df_live_...' })

// Create a new deal
const deal = await df.deals.create({
  type: 'negotiation',          // 'negotiation' | 'procurement' | 'return' | 'sales' | 'custom'
  intent: 'Buy 100 units',      // what the deal is about
  constraints: { budget_max: 5000 },
  tags: ['pilot'],
})

// Resume an existing deal
const deal = await df.deals.resume('deal_abc123')

// List deals with filters
const { deals, total } = await df.deals.list({
  status: 'active',
  type: 'negotiation',
  search: 'bearings',
  page: 1,
  per_page: 20,
})
```

### Acting on Deals

Every method updates the local deal state from the API response — no need to call `refresh()`.

```typescript
// Make an offer
await deal.offer({ price: 4200, currency: 'USD', actor: 'buyer-agent' })

// Counter an offer
await deal.counter({ price: 3800, currency: 'USD', in_response_to: 'off_abc', actor: 'seller-agent' })

// Accept an offer
await deal.accept({ offer_id: 'off_abc', actor: 'seller-agent' })

// Reject an offer
await deal.reject({ offer_id: 'off_abc', reason: 'Too expensive', actor: 'buyer-agent' })

// Withdraw an offer
await deal.withdraw({ offer_id: 'off_abc', reason: 'Changed terms', actor: 'buyer-agent' })

// Escalate to another handler
await deal.escalate({ to: 'manager-agent', reason: 'Over budget', actor: 'buyer-agent' })

// Reassign
await deal.reassign('new-handler', 'admin')

// Pause and resume
await deal.pause('buyer-agent', 'Waiting for approval')
await deal.resumeProcess('buyer-agent')

// Close with outcome
await deal.close({ outcome: 'completed', final_value: 4200, actor: 'seller' })

// Cancel
await deal.cancel('buyer-agent', 'No longer needed')

// Add a note
await deal.note('Supplier confirmed ISO compliance', 'buyer-agent')

// Flag a compliance issue
await deal.flag({ type: 'policy_violation', message: 'Missing docs', severity: 'warning', actor: 'buyer-agent' })

// Generic action (for advanced use)
await deal.act('offer', { price: 100, actor: 'buyer-agent' })
```

### Reading Deal State

```typescript
deal.id                  // string — unique deal ID
deal.status              // 'active' | 'paused' | 'escalated' | 'closed' | 'expired' | 'cancelled'
deal.type                // 'negotiation' | 'procurement' | 'return' | 'sales' | 'custom'
deal.intent              // string — what the deal is about
deal.summary             // string — AI-generated summary (never null)
deal.bestOffer           // DealOffer | null
deal.pendingOffers       // DealOffer[] — only pending offers
deal.acceptedOffer       // DealOffer | null — first accepted offer
deal.isActive            // boolean
deal.isClosed            // boolean — closed, cancelled, or expired
deal.isExpired           // boolean — past expires_at
deal.hasComplianceIssues // boolean — any critical flags
deal.criticalFlags       // ComplianceFlag[] — severity 'critical'
deal.warningFlags        // ComplianceFlag[] — severity 'warning'
deal.durationMs          // number — ms since creation (or creation → close)
deal.history             // DealEvent[] — full event log
deal.offers              // DealOffer[] — all offers
deal.constraints         // DealConstraints
deal.parties             // DealParty[]
deal.tags                // string[]
deal.metadata            // Record<string, unknown>

// Refresh from server
await deal.refresh()

// Serialise
const json = deal.toJSON()
```

## Error Handling

```typescript
import { Dealflow, DealflowError } from '@dealflow/sdk'

try {
  await deal.offer({ price: 100, actor: 'agent' })
} catch (err) {
  if (err instanceof DealflowError) {
    console.log(err.message) // "Action not allowed in current state"
    console.log(err.code)    // "INVALID_ACTION"
    console.log(err.status)  // 400
    console.log(err.toString())
    // → "DealflowError [INVALID_ACTION] (400): Action not allowed in current state"
  }
}
```

### Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `INVALID_API_KEY` | 401 | API key is missing or invalid |
| `DEAL_NOT_FOUND` | 404 | Deal ID does not exist |
| `OFFER_NOT_FOUND` | 404 | Offer ID does not exist on this deal |
| `VALIDATION_ERROR` | 400/422 | Invalid request body |
| `INVALID_REQUEST` | 400 | Client-side validation failed |
| `OFFER_CONFLICT` | 409 | Offer is not in a valid state for this action |
| `NETWORK_ERROR` | 0 | Could not reach the API server |

## TypeScript

The SDK is written in TypeScript and ships with full type definitions. No `@types` package needed — just install and import.

```typescript
import type { DealData, DealOffer, ComplianceFlag, CreateDealRequest } from '@dealflow/sdk'
```

## Self-Hosted

Point the SDK at your own server:

```typescript
const df = new Dealflow({
  apiKey: 'your-key',
  baseUrl: 'http://localhost:4010',
})
```

## Webhook Signature Verification

When Dealflow delivers a webhook event to your server, it includes an HMAC-SHA256 signature in the `X-Dealflow-Signature` header so you can verify the payload was actually sent by Dealflow.

Your server should:
1. Extract `X-Dealflow-Signature` and `X-Dealflow-Timestamp` headers.
2. Verify the timestamp is within 5 minutes (prevents replay attacks).
3. Compute the HMAC-SHA256 of the **raw request body string** using your Webhook Secret.
4. Compare it to the header signature.

**Example (Express.js):**

```typescript
import crypto from 'node:crypto'
import express from 'express'

const app = express()

// You must use express.raw or similar to get the unparsed string.
// Parsed JSON objects might shift object keys and break the signature sequence.
app.post('/webhooks/dealflow', express.text({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-dealflow-signature'] as string
  const timestamp = Number(req.headers['x-dealflow-timestamp'])
  const payloadString = req.body // Raw string payload

  // 1. Check timestamp
  if (Date.now() / 1000 - timestamp > 300) {
    return res.status(400).send('Webhook timestamp too old')
  }

  // 2. Compute HMAC
  const WEBHOOK_SECRET = process.env.DEALFLOW_WEBHOOK_SECRET!
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payloadString)
    .digest('hex')

  // 3. Constant-time comparison
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      throw new Error('Invalid signature')
    }
  } catch (e) {
    return res.status(401).send('Invalid webhook signature')
  }

  // Signature is valid! Parse payload
  const event = JSON.parse(payloadString)
  console.log('Received valid Dealflow event:', event.event)

  res.status(200).send('OK')
})
```

---

## License

MIT © Dealflow

// ---------------------------------------------------------------------------
// @dealflow/sdk — Integration Test
//
// This test runs the full hero scenario against a real server.
// It is SKIPPED if DEALFLOW_TEST_API_KEY and DEALFLOW_TEST_BASE_URL are not set.
//
// To run:
//   1. Start the HTTP server (npm run test:http from repo root — it seeds a key)
//   2. Set env vars:
//      DEALFLOW_TEST_API_KEY=<seeded key>  DEALFLOW_TEST_BASE_URL=http://127.0.0.1:4010
//   3. node src/__tests__/integration.test.mjs
// ---------------------------------------------------------------------------

import assert from 'node:assert/strict'

const API_KEY = process.env.DEALFLOW_TEST_API_KEY
const BASE_URL = process.env.DEALFLOW_TEST_BASE_URL

if (!API_KEY || !BASE_URL) {
    console.log('⏭  Skipping SDK integration tests (DEALFLOW_TEST_API_KEY / DEALFLOW_TEST_BASE_URL not set)')
    process.exit(0)
}

// Import from the built dist — tests run after `npm run build`
const { Dealflow, DealflowError } = await import('../../dist/index.js')

const df = new Dealflow({ apiKey: API_KEY, baseUrl: BASE_URL })

// ── Step 1: Create a deal ─────────────────────────────────────────────────
console.log('1. Creating deal...')
const deal = await df.deals.create({
    type: 'negotiation',
    intent: 'Procure 200 units bearings',
    parties: [
        { id: 'buyer-agent', role: 'buyer', type: 'agent' },
        { id: 'seller-agent', role: 'seller', type: 'agent' },
    ],
    constraints: {
        budget_max: 5000,
        budget_min: 3500,
        currency: 'USD',
    },
})

assert.ok(deal.id, 'deal should have an id')
assert.equal(deal.type, 'negotiation')
assert.equal(deal.status, 'active')
assert.equal(deal.isActive, true)
assert.equal(deal.isClosed, false)

// ── Step 2: Verify summary ────────────────────────────────────────────────
console.log('2. Checking summary...')
assert.equal(typeof deal.summary, 'string')
assert.ok(deal.summary.length > 0, 'summary should be non-empty')

// ── Step 3: Make an offer within budget ───────────────────────────────────
console.log('3. Making offer within budget ($4200)...')
await deal.offer({ price: 4200, currency: 'USD', actor: 'buyer-agent' })

assert.ok(deal.offers && deal.offers.length >= 1, 'should have at least 1 offer')
assert.equal(typeof deal.summary, 'string')
assert.ok(deal.summary.length > 0, 'summary should update after offer')

// ── Step 4: Make an offer below budget_min → compliance flag ──────────────
console.log('4. Making offer below floor ($3200)...')
await deal.offer({ price: 3200, currency: 'USD', actor: 'buyer-agent' })

assert.ok(
    deal.compliance_flags.some((f) => f.type === 'price_floor_violated'),
    'should have price_floor_violated flag',
)
assert.equal(deal.hasComplianceIssues, true)
assert.ok(deal.criticalFlags.length > 0, 'should have critical flags')

// ── Step 5: Escalate ──────────────────────────────────────────────────────
console.log('5. Escalating deal...')
await deal.escalate({
    to: 'seller-agent',
    reason: 'Price below floor — need seller input',
    actor: 'buyer-agent',
})

assert.equal(deal.status, 'escalated')
assert.equal(deal.current_handler, 'seller-agent')

// ── Step 6: Resume in a completely new client (simulates a new process) ───
console.log('6. Resuming deal in new client...')
const df2 = new Dealflow({ apiKey: API_KEY, baseUrl: BASE_URL })
const resumed = await df2.deals.resume(deal.id)

assert.equal(resumed.id, deal.id)
assert.equal(resumed.status, 'escalated')
assert.equal(typeof resumed.summary, 'string')
assert.ok(resumed.summary.length > 0, 'resumed deal should have summary')
assert.ok(
    resumed.compliance_flags.some((f) => f.type === 'price_floor_violated'),
    'resumed deal should preserve compliance flags',
)

// ── Step 7: Reassign deal back to active (escalated → active) ────────────
console.log('7. Reassigning deal (escalated → active)...')
await resumed.reassign('buyer-agent', 'seller-agent')
assert.equal(resumed.status, 'active')
assert.equal(resumed.isActive, true)

// ── Step 8: Accept the valid offer ────────────────────────────────────────
console.log('8. Accepting the valid offer...')
const validOffer = resumed.offers?.find((o) => o.price === 4200)
assert.ok(validOffer, 'should find the $4200 offer')

await resumed.accept({ offer_id: validOffer.id, actor: 'seller-agent' })

// ── Step 9: Close the deal ────────────────────────────────────────────────
console.log('9. Closing deal...')
await resumed.close({
    outcome: 'completed',
    final_value: 4200,
    final_currency: 'USD',
    actor: 'seller-agent',
})

assert.equal(resumed.isClosed, true)
assert.equal(resumed.outcome, 'completed')
assert.equal(resumed.isActive, false)

// ── Step 10: Verify toJSON ─────────────────────────────────────────────────
console.log('10. Testing toJSON...')
const json = resumed.toJSON()
assert.equal(json.id, resumed.id)
assert.equal(typeof json, 'object')
assert.equal(json.status, 'closed')

// ── Step 11: Verify durationMs ────────────────────────────────────────────
console.log('11. Testing durationMs...')
assert.equal(typeof resumed.durationMs, 'number')
assert.ok(resumed.durationMs >= 0, 'durationMs should be non-negative')
assert.ok(!Number.isNaN(resumed.durationMs), 'durationMs must not be NaN')

// ── Step 12: Verify DealflowError ─────────────────────────────────────────
console.log('12. Testing DealflowError...')
let errorThrown = false
try {
    // Trying to act on a closed deal should fail
    await resumed.offer({ price: 1000, currency: 'USD', actor: 'buyer-agent' })
} catch (err) {
    errorThrown = true
    assert.ok(err instanceof DealflowError, 'error should be DealflowError')
    assert.equal(typeof err.code, 'string')
    assert.equal(typeof err.status, 'number')
    assert.ok(err.toString().includes('DealflowError'), 'toString should include class name')
}
assert.equal(errorThrown, true, 'acting on closed deal should throw')

// ── Step 13: Verify client-side validation ────────────────────────────────
console.log('13. Testing client-side validation...')
let validationError = false
try {
    await df.deals.create({ type: 'invalid_type', intent: '' })
} catch (err) {
    validationError = true
    assert.ok(err instanceof DealflowError)
    assert.equal(err.code, 'INVALID_REQUEST')
    assert.equal(err.status, 400)
}
assert.equal(validationError, true, 'invalid create should throw')

// ── Step 14: List deals ───────────────────────────────────────────────────
console.log('14. Testing deals.list()...')
const listed = await df.deals.list({ status: 'closed' })
assert.ok(Array.isArray(listed.deals), 'listed.deals should be an array')
assert.equal(typeof listed.total, 'number')

console.log('')
console.log('✅ All SDK integration tests passed!')

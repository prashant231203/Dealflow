import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { generateApiKey, verifyApiKey } from '../lib/auth/api-keys.ts'
import { actOnDeal } from '../app/api/v1/deals/[dealId]/actions/service.ts'
import { createDeal, listDeals } from '../app/api/v1/deals/service.ts'
import { computeBestOffer } from '../lib/intelligence/offers.ts'
import { checkCompliance } from '../lib/intelligence/compliance.ts'
import { isActionAllowed } from '../lib/deals/state-machine.ts'
import { memoryStore } from '../lib/store/in-memory.ts'

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
const publicKeyHex = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex')

function signAction(action, payload) {
  const signedMessage = JSON.stringify({ action, payload })
  const signature = crypto.sign(null, Buffer.from(signedMessage), privateKey)
  return {
    signature: signature.toString('hex'),
    publicKey: publicKeyHex,
  }
}

assert.equal(isActionAllowed('active', 'pause'), true)
assert.equal(isActionAllowed('closed', 'offer'), false)

const key = generateApiKey('production')
assert.equal(key.plaintext.startsWith('df_live_'), true)
assert.equal(verifyApiKey(key.plaintext, key.keyHash), true)

const created = createDeal({ type: 'negotiation', intent: 'Buy 100 units', constraints: { budget_min: 100, budget_max: 500, requirements: ['ISO_9001'] }, tags: ['pilot'] }, 'dev_1')
const baseDeal = created.deal
const compliance = checkCompliance(baseDeal, 'offer', { price: 700, conditions: [] })
assert.equal(compliance.some((flag) => flag.type === 'over_budget'), true)
assert.equal(compliance.some((flag) => flag.type === 'policy_violation' && flag.message.includes('Missing')), true)

const afterOffer = await actOnDeal(
  baseDeal,
  [],
  {
    action: 'offer',
    actor: 'buyer-agent',
    payload: { price: 450, currency: 'USD', conditions: ['ISO_9001'] },
    ...signAction('offer', { price: 450, currency: 'USD', conditions: ['ISO_9001'] }),
  },
)
assert.equal(afterOffer.deal.offers?.length, 1)
memoryStore.offers = afterOffer.offers
const best = computeBestOffer(baseDeal.id, baseDeal.constraints, 'negotiation', afterOffer.offers)
assert.equal(best?.price, 450)

const listed = listDeals([afterOffer.deal], { status: 'active', tags: 'pilot', search: '100 units' }, 1, 20)
assert.equal(listed.body.total, 1)

let offerNotFoundRaised = false
try {
  await actOnDeal(afterOffer.deal, afterOffer.offers, {
    action: 'accept',
    actor: 'buyer-agent',
    payload: { offer_id: 'off_missing' },
    ...signAction('accept', { offer_id: 'off_missing' }),
  })
} catch (error) {
  offerNotFoundRaised = error.code === 'OFFER_NOT_FOUND'
}
assert.equal(offerNotFoundRaised, true)

console.log('Domain checks passed')

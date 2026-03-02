import { authenticateRequest } from '../../../../../../lib/auth/middleware.js'
import { appendEvent } from '../../../../../../lib/deals/events.js'
import { checkCompliance } from '../../../../../../lib/intelligence/compliance.js'
import { computeBestOffer } from '../../../../../../lib/intelligence/offers.js'
import { generateDealSummary } from '../../../../../../lib/intelligence/summary.js'
import { memoryStore } from '../../../../../../lib/store/in-memory.js'
import { errorResponse, handleRouteError, invalidApiKeyResponse, json, parseJson } from '../../../../../../lib/utils/http.js'
import type { ActOnDealRequest, OfferPayload } from '../../../../../../types/index.js'
import { actOnDeal } from './service.js'

function dedupeComplianceFlags(flags: typeof memoryStore.deals[number]['compliance_flags']) {
  const seen = new Set<string>()
  const deduped = []
  for (const flag of flags) {
    const key = `${flag.type}|${flag.severity}|${flag.message}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(flag)
  }
  return deduped
}

export async function POST(
  request: Request,
  context: { params: { dealId: string } },
): Promise<Response> {
  const auth = await authenticateRequest(request)
  if (!auth) return invalidApiKeyResponse()

  try {
    const deal = memoryStore.deals.find(
      (item) => item.id === context.params.dealId && item.developer_id === auth.developer.id,
    )

    if (!deal) return errorResponse('Deal not found', 'DEAL_NOT_FOUND', 404)

    const body = await parseJson<ActOnDealRequest>(request)
    const offers = memoryStore.offers.filter((item) => item.deal_id === deal.id)

    const acted = await actOnDeal(deal, offers, body)

    // Step 1: compliance
    const complianceFlags = checkCompliance(acted.deal, body.action, body.payload as unknown as OfferPayload)
    acted.deal.compliance_flags = dedupeComplianceFlags([...(acted.deal.compliance_flags ?? []), ...complianceFlags])

    // Persist deal+offers before recomputing from store
    const dealIndex = memoryStore.deals.findIndex((item) => item.id === deal.id)
    if (dealIndex >= 0) memoryStore.deals[dealIndex] = acted.deal
    memoryStore.offers = [...memoryStore.offers.filter((item) => item.deal_id !== deal.id), ...acted.offers]

    // Step 2: best offer
    acted.deal.current_best_offer = computeBestOffer(acted.deal.id, acted.deal.constraints, acted.deal.type)
    memoryStore.deals[dealIndex] = acted.deal

    // Step 3: summary
    const recentEvents = memoryStore.events
      .filter((item) => item.deal_id === deal.id)
      .sort((a, b) => b.sequence_number - a.sequence_number)
      .slice(0, 10)
      .reverse()

    const pendingOffers = memoryStore.offers.filter((item) => item.deal_id === deal.id && item.status === 'pending')
    const summary = await generateDealSummary(acted.deal, recentEvents, pendingOffers, body.action, body.actor)
    const historyCount = memoryStore.events.filter((item) => item.deal_id === deal.id).length

    acted.deal.current_summary = summary
    const event = appendEvent({
      deal_id: deal.id,
      action: body.action,
      actor: body.actor,
      payload: body.payload,
      summary_before: deal.current_summary,
      summary_after: summary,
      sequence_number: historyCount + 1,
    })

    memoryStore.events.push(event)
    acted.deal.history = [...(memoryStore.events.filter((item) => item.deal_id === deal.id))]
    memoryStore.deals[dealIndex] = acted.deal

    // Step 4: return updated deal
    return json({ deal: acted.deal })
  } catch (error) {
    return handleRouteError(error)
  }
}

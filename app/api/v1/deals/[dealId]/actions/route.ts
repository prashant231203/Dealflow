import { authenticateRequest } from '../../../../../../lib/auth/middleware'
import { checkCompliance } from '../../../../../../lib/intelligence/compliance'
import { computeBestOffer } from '../../../../../../lib/intelligence/offers'
import { generateDealSummary } from '../../../../../../lib/intelligence/summary'
import { errorResponse, handleRouteError, invalidApiKeyResponse, json, parseJson } from '../../../../../../lib/utils/http'
import type { ActOnDealRequest, OfferPayload } from '../../../../../../types/index'
import { actOnDeal } from './service'
import { fireWebhooks, mapActionToEvents } from '../../../../../../lib/webhooks/delivery'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function dedupeComplianceFlags(flags: any[]) {
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
  context: { params: Promise<{ dealId: string }> },
): Promise<Response> {
  const { dealId } = await context.params
  const auth = await authenticateRequest(request)
  if (!auth) return invalidApiKeyResponse()

  try {
    // 1. Fetch current state
    const [
      { data: deal, error: dealError },
      { data: offers, error: offersError },
      { count: historyCount, error: countError }
    ] = await Promise.all([
      supabaseAdmin.from('deals').select('*').eq('id', dealId).eq('developer_id', auth.developer.id).single(),
      supabaseAdmin.from('deal_offers').select('*').eq('deal_id', dealId),
      supabaseAdmin.from('deal_events').select('*', { count: 'exact', head: true }).eq('deal_id', dealId)
    ])

    if (dealError || !deal) return errorResponse('Deal not found', 'DEAL_NOT_FOUND', 404)
    if (offersError) throw offersError
    if (countError) throw countError

    const body = await parseJson<ActOnDealRequest>(request)

    // 2. Compute state changes
    const acted = await actOnDeal(deal, offers ?? [], body)

    // 3. Compliance & Best Offer
    const complianceFlags = checkCompliance(acted.deal, body.action, body.payload as unknown as OfferPayload)
    acted.deal.compliance_flags = dedupeComplianceFlags([...(acted.deal.compliance_flags ?? []), ...complianceFlags])

    // Recompute best offer from the new list
    acted.deal.current_best_offer = computeBestOffer(dealId, acted.deal.constraints, acted.deal.type, acted.offers)

    // 4. Generate Summary & Event
    const { data: recentEvents } = await supabaseAdmin
      .from('deal_events')
      .select('*')
      .eq('deal_id', dealId)
      .order('sequence_number', { ascending: false })
      .limit(10)

    const pendingOffers = acted.offers.filter(o => o.status === 'pending')
    const summary = await generateDealSummary(acted.deal, (recentEvents ?? []).reverse(), pendingOffers, body.action, body.actor)
    acted.deal.current_summary = summary

    // 5. Persist Everything
    // A. Update Deal
    const { error: updateError } = await supabaseAdmin
      .from('deals')
      .update({
        status: acted.deal.status,
        updated_at: new Date().toISOString(),
        outcome: acted.deal.outcome,
        closed_at: acted.deal.closed_at,
        current_summary: summary,
        current_best_offer: acted.deal.current_best_offer,
        compliance_flags: acted.deal.compliance_flags,
        final_value: acted.deal.final_value,
        final_currency: acted.deal.final_currency,
        current_handler: acted.deal.current_handler
      })
      .eq('id', dealId)

    if (updateError) throw updateError

    // B. Upsert Offers (if any new or changed)
    if (acted.offers.length > 0) {
      const { error: offersUpsertError } = await supabaseAdmin
        .from('deal_offers')
        .upsert(acted.offers.map(o => ({
          ...o,
          deal_id: dealId // Ensure deal_id is correct
        })))
      if (offersUpsertError) throw offersUpsertError
    }

    // C. Insert Event
    const { error: eventError } = await supabaseAdmin.from('deal_events').insert({
      deal_id: dealId,
      action: body.action,
      actor: body.actor,
      payload: body.payload,
      summary_before: deal.current_summary,
      summary_after: summary,
      sequence_number: (historyCount ?? 0) + 1
    })
    if (eventError) throw eventError

    // 6. Fire webhooks
    const eventsToFire = mapActionToEvents(body.action, acted.deal, complianceFlags)
    if (eventsToFire.length > 0) {
      fireWebhooks(auth.developer.id, dealId, eventsToFire[0], acted.deal, eventsToFire.slice(1))
    }

    return json({ deal: acted.deal })
  } catch (error) {
    return handleRouteError(error)
  }
}

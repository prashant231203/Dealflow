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

async function processDealAction(dealId: string, auth: any, request: Request): Promise<Response> {
  try {
    // 1. Fetch current state
    const [
      { data: deal, error: dealError },
      { data: offers, error: offersError },
      { count: historyCount, error: countError },
      { data: recentEvents }
    ] = await Promise.all([
      supabaseAdmin.from('deals').select('*').eq('id', dealId).eq('developer_id', auth.developer.id).single(),
      supabaseAdmin.from('deal_offers').select('*').eq('deal_id', dealId),
      supabaseAdmin.from('deal_events').select('*', { count: 'exact', head: true }).eq('deal_id', dealId),
      supabaseAdmin.from('deal_events').select('*').eq('deal_id', dealId).order('sequence_number', { ascending: false }).limit(10)
    ])

    if (dealError || !deal) return errorResponse('Deal not found', 'DEAL_NOT_FOUND', 404)
    if (offersError) throw offersError
    if (countError) throw countError

    const body = await parseJson<ActOnDealRequest>(request)

    // 2. Prevent Agentic Drift (Intent Validation)
    const { verifyActionIntent } = await import('../../../../../../lib/intelligence/intent')
    await verifyActionIntent(deal, body.action, body.payload, recentEvents ?? [])

    // 2b. Circuit Breaker (Phase 4)
    const { checkActionVelocity } = await import('../../../../../../lib/intelligence/circuit-breaker')
    const velocity = checkActionVelocity(recentEvents ?? [], body)

    let circuitTripFlag = null
    if (velocity.tripped) {
      body.action = 'pause'
      body.payload = { reason: velocity.reason }
      circuitTripFlag = {
        type: 'policy_violation',
        message: velocity.reason ?? 'Circuit Breaker Tripped',
        severity: 'warning', // Warning severity allows the DB transaction to complete without triggering 422 block
        detected_at: new Date().toISOString()
      }
    }

    // 2a. Pre-flight Hard Compliance Checks (Phase 2)
    // We skip compliance blocks if the circuit broke, allowing the 'pause' action to persist cleanly.
    let complianceFlags: any[] = []
    if (!velocity.tripped) {
      complianceFlags = checkCompliance(deal, body.action, body.payload as unknown as OfferPayload)
      const criticalFlag = complianceFlags.find(f => f.severity === 'critical')

      if (criticalFlag) {
        return new Response(JSON.stringify({
          error: "Action Blocked by Compliance Guardrail",
          code: "COMPLIANCE_VIOLATION",
          status: 422,
          flag: criticalFlag
        }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    // 3. Compute state changes
    const acted = await actOnDeal(deal, offers ?? [], body)

    // 3b. Append warnings/flags
    const flagsToAppend = velocity.tripped ? [circuitTripFlag] : complianceFlags
    acted.deal.compliance_flags = dedupeComplianceFlags([...(acted.deal.compliance_flags ?? []), ...flagsToAppend])

    // Recompute best offer from the new list
    acted.deal.current_best_offer = computeBestOffer(dealId, acted.deal.constraints, acted.deal.type, acted.offers)

    // 4. Generate Summary & Event
    const pendingOffers = acted.offers.filter(o => o.status === 'pending')
    const summary = await generateDealSummary(acted.deal, (recentEvents ?? []).reverse(), pendingOffers, body.action, body.actor)
    acted.deal.current_summary = summary

    // 5. Persist Everything
    // A. Update Deal (Atomic OCC when schema supports version)
    const hasVersionColumn = typeof (deal as any).version === 'number'
    const baseUpdatePayload: Record<string, unknown> = {
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
    }

    if (hasVersionColumn) {
      baseUpdatePayload.version = (deal as any).version + 1
    }

    let updateQuery = supabaseAdmin
      .from('deals')
      .update(baseUpdatePayload)
      .eq('id', dealId)

    if (hasVersionColumn) {
      updateQuery = updateQuery.eq('version', (deal as any).version)
    }

    let { data: updateData, error: updateError } = await updateQuery.select('id')

    // Backward compatibility for environments where migration 005 isn't applied yet.
    if (updateError?.code === 'PGRST204' && updateError.message?.includes("'version'")) {
      const fallbackResult = await supabaseAdmin
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
        .select('id')

      updateData = fallbackResult.data
      updateError = fallbackResult.error
    }

    if (updateError) throw updateError
    if (hasVersionColumn && (!updateData || updateData.length === 0)) {
      return errorResponse('Version mismatch: The deal was updated by another request. Please retry.', 'DOUBLE_SPEND_DETECTED', 409)
    }

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
    const eventInsertPayload: any = {
      deal_id: dealId,
      action: body.action,
      actor: body.actor,
      payload: body.payload,
      signature_proof: body.signature && body.publicKey ? { signature: body.signature, publicKey: body.publicKey } : null,
      summary_before: deal.current_summary,
      summary_after: summary,
      sequence_number: (historyCount ?? 0) + 1
    }

    let { data: eventData, error: eventError } = await supabaseAdmin.from('deal_events').insert(eventInsertPayload).select().single()

    if (eventError?.code === 'PGRST204' && eventError.message?.includes('signature_proof')) {
      delete eventInsertPayload.signature_proof
      const fallbackEvent = await supabaseAdmin.from('deal_events').insert(eventInsertPayload).select().single()
      eventData = fallbackEvent.data
      eventError = fallbackEvent.error
    }

    if (eventError) throw eventError

    // 6. Fire webhooks
    const eventsToFire = mapActionToEvents(body.action, acted.deal, complianceFlags)
    if (eventsToFire.length > 0) {
      fireWebhooks(auth.developer.id, dealId, eventsToFire[0], acted.deal, eventsToFire.slice(1))
    }

    // 7. Settlement Dispatcher (Phase 5)
    if (acted.deal.status === 'closed' || acted.deal.status === 'cancelled') {
      const { dispatchSettlementProtocol } = await import('../../../../../../lib/webhooks/settlement')
      dispatchSettlementProtocol(acted.deal, eventData)
    }

    return json({ deal: acted.deal })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ dealId: string }> },
): Promise<Response> {
  const { dealId } = await context.params
  const auth = await authenticateRequest(request)
  if (!auth) return invalidApiKeyResponse()

  const idempotencyKey = request.headers.get('x-idempotency-key')

  if (idempotencyKey) {
    const { error: lockError } = await supabaseAdmin.from('idempotency_keys').insert({
      key: idempotencyKey,
      developer_id: auth.developer.id,
      status: 'started'
    })

    if (lockError) {
      // If table doesn't exist, just skip idempotency logic for now
      if (lockError.code === 'PGRST204') {
        console.warn('Idempotency table missing, skipping check')
      } else if (lockError.code === '23505' || lockError.message?.includes('duplicate key')) {
        const { data: existing } = await supabaseAdmin.from('idempotency_keys').select('*').eq('key', idempotencyKey).eq('developer_id', auth.developer.id).single()
        if (existing?.status === 'started') return errorResponse('Concurrent request in flight. Please backoff.', 'TOO_EARLY', 425)
        if (existing?.status === 'completed') return new Response(JSON.stringify(existing.response_body), { status: existing.response_status, headers: { 'Content-Type': 'application/json' } })
      } else {
        return handleRouteError(lockError)
      }
    }
  }

  const finalResponse = await processDealAction(dealId, auth, request)

  // 8. Release Idempotency Lock
  if (idempotencyKey) {
    try {
      const clonedObj = await finalResponse.clone().json().catch(() => null)
      await supabaseAdmin.from('idempotency_keys').update({
        status: 'completed',
        response_body: clonedObj,
        response_status: finalResponse.status
      }).eq('key', idempotencyKey).eq('developer_id', auth.developer.id)
    } catch {
      // Ignore errors if table missing
    }
  }

  return finalResponse
}

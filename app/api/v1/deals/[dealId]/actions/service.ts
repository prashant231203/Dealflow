import { ApiError } from '../../../../../../lib/utils/response.js'
import {
  parseAcceptPayload,
  parseRejectPayload,
  validateActOnDealRequest,
} from '../../../../../../lib/utils/validation.js'
import { assertActionAllowed } from '../../../../../../lib/deals/state-machine.js'
import { createOfferId } from '../../../../../../lib/deals/ids.js'
import type { ActOnDealRequest, DealData, DealOffer } from '../../../../../../types/index.js'

export async function actOnDeal(
  deal: DealData,
  offers: DealOffer[],
  request: ActOnDealRequest,
): Promise<{ deal: DealData; offers: DealOffer[] }> {
  validateActOnDealRequest(request)
  assertActionAllowed(deal.status, request.action)

  const updates: DealData = { ...deal, updated_at: new Date().toISOString() }
  const offerList = [...offers]

  if (request.action === 'offer' || request.action === 'counter') {
    const price = request.payload.price
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      throw new ApiError('price must be a positive number for offer/counter', 'VALIDATION_ERROR', 422)
    }

    const currency = request.payload.currency
    if (currency !== undefined && typeof currency !== 'string') {
      throw new ApiError('currency must be a string', 'VALIDATION_ERROR', 422)
    }

    const conditions = request.payload.conditions
    const includes = request.payload.includes

    offerList.push({
      id: createOfferId(),
      deal_id: deal.id,
      made_by: request.actor,
      price,
      currency: (currency as string | undefined) ?? deal.constraints.currency ?? 'USD',
      status: 'pending',
      conditions: Array.isArray(conditions) ? (conditions as string[]) : undefined,
      includes: Array.isArray(includes) ? (includes as string[]) : undefined,
      created_at: new Date().toISOString(),
      within_budget: deal.constraints.budget_max ? price <= deal.constraints.budget_max : null,
    })
  }

  if (request.action === 'accept') {
    const payload = parseAcceptPayload(request.payload)
    const target = offerList.find((offer) => offer.id === payload.offer_id)

    if (!target) throw new ApiError('offer_id does not exist in this deal', 'OFFER_NOT_FOUND', 404)
    if (target.status !== 'pending') throw new ApiError('offer is not pending and cannot be accepted', 'OFFER_CONFLICT', 409)

    for (const offer of offerList) {
      if (offer.id === payload.offer_id) {
        offer.status = 'accepted'
        offer.responded_by = request.actor
        offer.response_note = payload.notes
      } else if (offer.status === 'pending') {
        offer.status = 'rejected'
      }
    }

    updates.final_value = target.price
    updates.final_currency = target.currency
  }

  if (request.action === 'reject') {
    const payload = parseRejectPayload(request.payload)
    const target = offerList.find((offer) => offer.id === payload.offer_id)

    if (!target) throw new ApiError('offer_id does not exist in this deal', 'OFFER_NOT_FOUND', 404)
    if (target.status !== 'pending') throw new ApiError('offer is not pending and cannot be rejected', 'OFFER_CONFLICT', 409)

    target.status = 'rejected'
    target.responded_by = request.actor
    target.response_note = payload.reason
  }

  if (request.action === 'pause') updates.status = 'paused'
  if (request.action === 'resume_process') updates.status = 'active'
  if (request.action === 'escalate') {
    updates.status = 'escalated'
    updates.current_handler = String(request.payload.to ?? '')
  }
  if (request.action === 'reassign') {
    updates.status = 'active'
    updates.current_handler = String(request.payload.to ?? '')
  }
  if (request.action === 'cancel') {
    updates.status = 'cancelled'
    updates.outcome = 'cancelled'
    updates.closed_at = new Date().toISOString()
  }
  if (request.action === 'close') {
    updates.status = 'closed'
    updates.outcome = 'completed'
    updates.closed_at = new Date().toISOString()
  }

  updates.offers = offerList
  return { deal: updates, offers: offerList }
}

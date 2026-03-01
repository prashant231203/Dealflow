import { generateDealSummary } from '../../../../../../lib/intelligence/summary.js'
import type { DealData, DealEvent, DealOffer } from '../../../../../../types/index.js'
import { ok } from '../../../../../../lib/utils/response.js'

export async function getDealSummary(deal: DealData, offers: DealOffer[], events: DealEvent[]) {
  const summary = await generateDealSummary(deal, offers, events)
  return ok({ summary })
}

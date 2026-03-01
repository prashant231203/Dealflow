import type { DealOffer } from '../../../../../../types/index.js'
import { ok } from '../../../../../../lib/utils/response.js'

export function getDealOffers(offers: DealOffer[]) {
  return ok({ offers })
}

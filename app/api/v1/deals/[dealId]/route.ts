import type { DealData } from '../../../../../types/index.js'
import { ok } from '../../../../../lib/utils/response.js'

export function getDeal(deal: DealData) {
  return ok({ deal })
}

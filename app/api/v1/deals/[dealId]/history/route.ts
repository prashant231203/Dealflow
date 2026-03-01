import type { DealEvent } from '../../../../../../types/index.js'
import { ok } from '../../../../../../lib/utils/response.js'

export function getDealHistory(history: DealEvent[]) {
  return ok({ history })
}

import type { DealAction, DealData, DealStatus } from '../../types/index'
import { ApiError } from '../utils/response'

export const VALID_TRANSITIONS: Record<DealStatus, DealAction[]> = {
  active: [
    'pause',
    'escalate',
    'close',
    'cancel',
    'offer',
    'counter',
    'accept',
    'reject',
    'withdraw',
    'note',
    'attach',
    'flag',
    'reassign',
    'update_constraints',
  ],
  paused: ['resume_process', 'escalate', 'cancel', 'note'],
  escalated: ['reassign', 'cancel', 'note', 'close'],
  closed: [],
  expired: [],
  cancelled: [],
}

export function isActionAllowed(status: DealStatus, action: DealAction): boolean {
  return VALID_TRANSITIONS[status].includes(action)
}

export function assertActionAllowed(deal: DealData, action: DealAction, payload?: any): void {
  if (!isActionAllowed(deal.status, action)) {
    throw new ApiError(`Action '${action}' is not allowed when deal status is '${deal.status}'`, 'INVALID_TRANSITION', 400)
  }

  // Constraint Validation Gatekeeper
  if (action === 'offer' || action === 'counter') {
    const price = payload?.price
    const { budget_max, budget_min } = deal.constraints

    if (typeof price === 'number') {
      if (typeof budget_max === 'number' && price > budget_max) {
        throw new ApiError(`Offer price ${price} exceeds the maximum allowed budget of ${budget_max}.`, 'CONSTRAINT_VIOLATED', 400)
      }
      if (typeof budget_min === 'number' && price < budget_min) {
        throw new ApiError(`Offer price ${price} is strictly below the required price floor of ${budget_min}.`, 'CONSTRAINT_VIOLATED', 400)
      }
    }
  }

  if (action === 'accept') {
    const offerId = payload?.offer_id
    if (!offerId) {
      throw new ApiError(`Cannot accept an offer without providing an offer_id.`, 'VALIDATION_ERROR', 400)
    }
    // Further bounds or expiry checks would be verified at the data layer
  }
}

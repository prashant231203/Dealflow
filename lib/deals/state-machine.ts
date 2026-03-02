import type { DealAction, DealStatus } from '../../types/index'

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

export function assertActionAllowed(status: DealStatus, action: DealAction): void {
  if (!isActionAllowed(status, action)) {
    throw new Error(`action '${action}' is not allowed when deal status is '${status}'`)
  }
}

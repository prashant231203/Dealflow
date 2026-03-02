import type { DealAction, DealEvent } from '../../types/index'
import { createEventId } from './ids'

export interface AppendEventInput {
  deal_id: string
  action: DealAction
  actor: string
  payload: Record<string, unknown>
  summary_before?: string
  summary_after?: string
  sequence_number: number
}

export function appendEvent(input: AppendEventInput): DealEvent {
  return {
    id: createEventId(),
    deal_id: input.deal_id,
    action: input.action,
    actor: input.actor,
    payload: input.payload,
    summary_before: input.summary_before,
    summary_after: input.summary_after,
    sequence_number: input.sequence_number,
    created_at: new Date().toISOString(),
  }
}

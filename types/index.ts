export type DealStatus = 'active' | 'paused' | 'escalated' | 'closed' | 'expired' | 'cancelled'

export type DealType = 'negotiation' | 'procurement' | 'return' | 'sales' | 'custom'

export type DealAction =
  | 'offer'
  | 'counter'
  | 'accept'
  | 'reject'
  | 'withdraw'
  | 'pause'
  | 'resume_process'
  | 'escalate'
  | 'reassign'
  | 'close'
  | 'cancel'
  | 'note'
  | 'attach'
  | 'flag'
  | 'update_constraints'
  | 'system_expired'
  | 'system_offer_expired'
  | 'created'

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired'

export interface DealflowConfig {
  apiKey: string
  baseUrl?: string
}

// ---------------------------------------------------------------------------
// Backend Database Records (Not part of SDK, used internally)
// ---------------------------------------------------------------------------

export interface WebhookRecord {
  id: string
  developer_id: string
  url: string
  events: string[]
  secret: string
  is_active: boolean
  description?: string
  created_at: string
  last_triggered_at?: string
}

export interface WebhookDeliveryRecord {
  id: string
  webhook_id: string
  deal_id?: string
  event: string
  payload: Record<string, unknown>
  attempt_number: number
  response_status?: number
  response_body?: string
  duration_ms?: number
  succeeded?: boolean
  error_message?: string
  created_at: string
  delivered_at?: string
}

export interface WebhookRetryQueueRecord {
  id: string
  webhook_id: string
  deal_id?: string
  payload: Record<string, unknown>
  event: string
  next_attempt_number: number
  retry_after: string
  created_at: string
}

export interface DealParty {
  id: string
  role: string
  type: 'agent' | 'human'
}

export interface DealConstraints {
  budget_max?: number
  budget_min?: number
  currency?: string
  deadline?: string
  quantity?: number
  unit?: string
  product_id?: string
  requirements?: string[]
  custom?: Record<string, unknown>
}

export interface DealOffer {
  id: string
  deal_id: string
  made_by: string
  price: number
  currency: string
  quantity?: number
  unit?: string
  conditions?: string[]
  includes?: string[]
  notes?: string
  status: OfferStatus
  responded_by?: string
  response_note?: string
  within_budget?: boolean | null
  meets_requirements?: boolean
  created_at: string
  expires_at?: string
  responded_at?: string
}

export interface DealEvent {
  id: string
  deal_id: string
  action: DealAction
  actor: string
  payload: Record<string, unknown>
  summary_before?: string
  summary_after?: string
  sequence_number: number
  created_at: string
}

export interface ComplianceFlag {
  type:
  | 'price_floor_violated'
  | 'over_budget'
  | 'deadline_missed'
  | 'unauthorized_action'
  | 'policy_violation'
  | 'missing_requirements'
  | 'expired_deal'
  | 'custom'
  message: string
  severity: 'warning' | 'critical'
  action_id?: string
  detected_at: string
  acknowledged_at?: string
}

export interface DealData {
  id: string
  developer_id: string
  type: DealType
  intent: string
  status: DealStatus
  parties: DealParty[]
  current_handler?: string
  constraints: DealConstraints
  current_summary?: string
  current_best_offer?: DealOffer | null
  compliance_flags: ComplianceFlag[]
  metadata: Record<string, unknown>
  tags: string[]
  created_at: string
  updated_at: string
  expires_at?: string
  closed_at?: string
  outcome?: 'completed' | 'cancelled' | 'expired' | 'failed'
  final_value?: number
  final_currency?: string
  history?: DealEvent[]
  offers?: DealOffer[]
}

export interface OfferPayload {
  price: number
  currency?: string
  quantity?: number
  unit?: string
  conditions?: string[]
  includes?: string[]
  notes?: string
  expires_in?: number
}

export interface CounterPayload extends OfferPayload {
  in_response_to?: string
}

export interface AcceptPayload {
  offer_id: string
  notes?: string
}

export interface RejectPayload {
  offer_id: string
  reason?: string
}

export interface EscalatePayload {
  to: string
  reason: string
  context?: string
}

export interface ClosePayload {
  outcome: 'completed' | 'cancelled' | 'failed'
  final_value?: number
  final_currency?: string
  notes?: string
}

export interface FlagPayload {
  type: ComplianceFlag['type']
  message: string
  severity: ComplianceFlag['severity']
}

export interface CreateDealRequest {
  type: DealType
  intent: string
  parties?: DealParty[]
  constraints?: DealConstraints
  metadata?: Record<string, unknown>
  tags?: string[]
  expires_in?: number
}

export interface ActOnDealRequest {
  action: DealAction
  actor: string
  payload: Record<string, unknown>
}

export interface DealListResponse {
  deals: DealData[]
  total: number
  page: number
  per_page: number
}

export interface DealDashboardTotals {
  deals: number
  active_deals: number
  paused_deals: number
  escalated_deals: number
  closed_deals: number
  critical_flags: number
}

export interface DealDashboardResponse {
  totals: DealDashboardTotals
  recent_deals: DealData[]
}

export interface DealFilters {
  status?: DealStatus
  type?: DealType
  current_handler?: string
  tags?: string
  created_after?: string
  created_before?: string
  search?: string
  page?: string
  per_page?: string
}

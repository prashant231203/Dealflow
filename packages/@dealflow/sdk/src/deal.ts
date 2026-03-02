// ---------------------------------------------------------------------------
// @dealflow/sdk — Deal Class
// ---------------------------------------------------------------------------

import type {
  AcceptPayload,
  ClosePayload,
  ComplianceFlag,
  CounterPayload,
  DealAction,
  DealConstraints,
  DealData,
  DealEvent,
  DealOffer,
  DealParty,
  DealStatus,
  DealType,
  EscalatePayload,
  FlagPayload,
  OfferPayload,
  RejectPayload,
  WithdrawPayload,
} from './types.js'
import type { Dealflow } from './client.js'

/**
 * Represents a single commerce deal. Wraps the raw API data and provides
 * typed convenience methods for every deal action.
 *
 * After any action method is called, the local properties are automatically
 * updated from the API response — no need to call `refresh()` manually.
 */
export class Deal {
  // ── Core identifiers ────────────────────────────────────────────────
  readonly id!: string
  readonly developer_id!: string
  readonly type!: DealType
  readonly intent!: string

  // ── Mutable state ───────────────────────────────────────────────────
  status!: DealStatus
  parties!: DealParty[]
  current_handler?: string
  constraints!: DealConstraints
  current_summary?: string
  current_best_offer?: DealOffer | null
  compliance_flags!: ComplianceFlag[]
  metadata!: Record<string, unknown>
  tags!: string[]
  created_at!: string
  updated_at!: string
  expires_at?: string
  closed_at?: string
  outcome?: 'completed' | 'cancelled' | 'expired' | 'failed'
  final_value?: number
  final_currency?: string
  history?: DealEvent[]
  offers?: DealOffer[]

  /** @internal */
  private readonly _client: Dealflow

  constructor(data: DealData, client: Dealflow) {
    this._client = client
    Object.assign(this, data)
  }

  // ── Computed Getters ────────────────────────────────────────────────

  /** Human-readable summary. Falls back to a constructed string if no AI summary is available. */
  get summary(): string {
    if (this.current_summary && this.current_summary.length > 0) return this.current_summary
    return `${this.type} deal for: ${this.intent}. Status: ${this.status}.`
  }

  /** The current best offer, or null. */
  get bestOffer(): DealOffer | null {
    return this.current_best_offer ?? null
  }

  /** All offers with status 'pending'. */
  get pendingOffers(): DealOffer[] {
    return (this.offers ?? []).filter((offer) => offer.status === 'pending')
  }

  /** The first accepted offer, or null. */
  get acceptedOffer(): DealOffer | null {
    return (this.offers ?? []).find((offer) => offer.status === 'accepted') ?? null
  }

  /** True if the deal has an expiry date that is in the past. */
  get isExpired(): boolean {
    return this.expires_at ? new Date(this.expires_at) < new Date() : false
  }

  /** True if the deal is closed, cancelled, or expired. */
  get isClosed(): boolean {
    return ['closed', 'cancelled', 'expired'].includes(this.status)
  }

  /** True if the deal is in 'active' status. */
  get isActive(): boolean {
    return this.status === 'active'
  }

  /** True if any compliance flag has severity 'critical'. */
  get hasComplianceIssues(): boolean {
    return this.compliance_flags.some((flag) => flag.severity === 'critical')
  }

  /** All compliance flags with severity 'critical'. */
  get criticalFlags(): ComplianceFlag[] {
    return this.compliance_flags.filter((flag) => flag.severity === 'critical')
  }

  /** All compliance flags with severity 'warning'. */
  get warningFlags(): ComplianceFlag[] {
    return this.compliance_flags.filter((flag) => flag.severity === 'warning')
  }

  /**
   * Duration of the deal in milliseconds.
   * If closed, returns `closed_at - created_at`.
   * If still open, returns `now - created_at`.
   * Returns 0 if `created_at` is missing (avoids NaN).
   */
  get durationMs(): number {
    if (!this.created_at) return 0
    const start = new Date(this.created_at).getTime()
    if (Number.isNaN(start)) return 0
    const end = this.closed_at ? new Date(this.closed_at).getTime() : Date.now()
    if (Number.isNaN(end)) return 0
    return end - start
  }

  // ── Core Action Method ──────────────────────────────────────────────

  /**
   * Perform any deal action. Sends the request to the API, updates local
   * state from the response, and returns `this` for optional chaining.
   */
  async act(action: DealAction, payload: { actor: string;[key: string]: unknown }): Promise<this> {
    const { actor, ...rest } = payload
    const response = await this._client._request<{ deal: DealData }>(
      'POST',
      `/api/v1/deals/${this.id}/actions`,
      { action, actor, payload: rest },
    )
    Object.assign(this, response.deal)
    return this
  }

  // ── Convenience Action Methods ──────────────────────────────────────

  /** Submit a new offer. */
  async offer(params: OfferPayload & { actor: string }): Promise<this> {
    return this.act('offer', { ...params })
  }

  /** Counter an existing offer. */
  async counter(params: CounterPayload & { actor: string }): Promise<this> {
    return this.act('counter', { ...params })
  }

  /** Accept an offer by ID. */
  async accept(params: AcceptPayload & { actor: string }): Promise<this> {
    return this.act('accept', { ...params })
  }

  /** Reject an offer by ID. */
  async reject(params: RejectPayload & { actor: string }): Promise<this> {
    return this.act('reject', { ...params })
  }

  /** Withdraw an offer by ID. */
  async withdraw(params: WithdrawPayload & { actor: string }): Promise<this> {
    return this.act('withdraw', { ...params })
  }

  /** Escalate the deal to a different handler. */
  async escalate(params: EscalatePayload & { actor: string }): Promise<this> {
    return this.act('escalate', { ...params })
  }

  /** Reassign the deal to a different handler. */
  async reassign(to: string, actor: string): Promise<this> {
    return this.act('reassign', { to, actor })
  }

  /** Pause the deal. */
  async pause(actor: string, reason?: string): Promise<this> {
    return this.act('pause', { actor, reason })
  }

  /**
   * Resume a paused deal. Note: the action string sent to the API is
   * `resume_process` (snake_case), not camelCase.
   */
  async resumeProcess(actor: string): Promise<this> {
    return this.act('resume_process', { actor })
  }

  /** Close the deal with an outcome. */
  async close(params: ClosePayload & { actor: string }): Promise<this> {
    return this.act('close', { ...params })
  }

  /** Cancel the deal. */
  async cancel(actor: string, reason?: string): Promise<this> {
    return this.act('cancel', { actor, reason })
  }

  /** Add a note to the deal. */
  async note(content: string, actor: string): Promise<this> {
    return this.act('note', { content, actor })
  }

  /** Flag a compliance issue. */
  async flag(params: FlagPayload & { actor: string }): Promise<this> {
    return this.act('flag', { ...params })
  }

  // ── Utility Methods ─────────────────────────────────────────────────

  /** Refresh local state from the API without taking an action. */
  async refresh(): Promise<this> {
    const response = await this._client._request<{ deal: DealData }>('GET', `/api/v1/deals/${this.id}`)
    Object.assign(this, response.deal)
    return this
  }

  /** Return a plain JSON-serialisable representation of the deal. */
  toJSON(): DealData {
    return {
      id: this.id,
      developer_id: this.developer_id,
      type: this.type,
      intent: this.intent,
      status: this.status,
      parties: this.parties,
      current_handler: this.current_handler,
      constraints: this.constraints,
      current_summary: this.current_summary,
      current_best_offer: this.current_best_offer,
      compliance_flags: this.compliance_flags,
      metadata: this.metadata,
      tags: this.tags,
      created_at: this.created_at,
      updated_at: this.updated_at,
      expires_at: this.expires_at,
      closed_at: this.closed_at,
      outcome: this.outcome,
      final_value: this.final_value,
      final_currency: this.final_currency,
      history: this.history,
      offers: this.offers,
    }
  }
}

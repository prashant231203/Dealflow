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
} from './types.js'
import type { Dealflow } from './client.js'

export class Deal {
  readonly id!: string
  readonly type!: DealType
  readonly intent!: string
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
  outcome?: string
  final_value?: number
  history?: DealEvent[]
  offers?: DealOffer[]

  constructor(data: DealData, private readonly client: Dealflow) {
    Object.assign(this, data)
  }

  async act<TPayload extends object>(action: DealAction, payload: TPayload & { actor: string }): Promise<this> {
    const { actor, ...rest } = payload
    const response = await this.client._request<{ deal: DealData }>('POST', `/api/v1/deals/${this.id}/actions`, {
      action,
      actor,
      payload: rest,
    })
    Object.assign(this, response.deal)
    return this
  }

  async offer(params: OfferPayload & { actor: string }): Promise<this> {
    return this.act('offer', params)
  }

  async counter(params: CounterPayload & { actor: string }): Promise<this> {
    return this.act('counter', params)
  }

  async accept(params: AcceptPayload & { actor: string }): Promise<this> {
    return this.act('accept', params)
  }

  async reject(params: RejectPayload & { actor: string }): Promise<this> {
    return this.act('reject', params)
  }

  async escalate(params: EscalatePayload & { actor: string }): Promise<this> {
    return this.act('escalate', params)
  }

  async reassign(to: string, actor: string): Promise<this> {
    return this.act('reassign', { to, actor })
  }

  async pause(reason: string, actor: string): Promise<this> {
    return this.act('pause', { reason, actor })
  }

  async close(params: ClosePayload & { actor: string }): Promise<this> {
    return this.act('close', params)
  }

  async note(content: string, actor: string): Promise<this> {
    return this.act('note', { content, actor })
  }

  async flag(params: FlagPayload & { actor: string }): Promise<this> {
    return this.act('flag', params)
  }

  get summary(): string {
    return this.current_summary ?? `${this.type} deal: ${this.intent}`
  }

  get bestOffer(): DealOffer | null {
    return this.current_best_offer ?? null
  }

  get isExpired(): boolean {
    return this.expires_at ? new Date(this.expires_at) < new Date() : false
  }

  get isClosed(): boolean {
    return ['closed', 'cancelled', 'expired'].includes(this.status)
  }

  get pendingOffers(): DealOffer[] {
    return (this.offers ?? []).filter((offer) => offer.status === 'pending')
  }

  get hasComplianceIssues(): boolean {
    return this.compliance_flags.some((flag) => flag.severity === 'critical')
  }

  get criticalFlags(): ComplianceFlag[] {
    return this.compliance_flags.filter((flag) => flag.severity === 'critical')
  }

  async refresh(): Promise<this> {
    const response = await this.client._request<{ deal: DealData }>('GET', `/api/v1/deals/${this.id}`)
    Object.assign(this, response.deal)
    return this
  }
}

// ---------------------------------------------------------------------------
// @dealflow/sdk — Dealflow Client
// ---------------------------------------------------------------------------

import { DealflowError } from './errors.js'
import { Deal } from './deal.js'
import type {
  CreateDealRequest,
  DealData,
  DealflowConfig,
  DealListFilters,
  DealListResponse,
  DealType,
} from './types.js'

const VALID_DEAL_TYPES: DealType[] = ['negotiation', 'procurement', 'return', 'sales', 'custom']

/**
 * The main entry point for the Dealflow SDK.
 *
 * ```ts
 * const df = new Dealflow({ apiKey: 'df_live_...' })
 * const deal = await df.deals.create({ type: 'negotiation', intent: 'Buy 100 units' })
 * ```
 */
export class Dealflow {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(config: DealflowConfig) {
    if (!config.apiKey || typeof config.apiKey !== 'string' || config.apiKey.trim().length === 0) {
      throw new Error('Dealflow: apiKey is required')
    }

    this.apiKey = config.apiKey
    this.baseUrl = (config.baseUrl ?? 'https://api.dealflow.dev').replace(/\/+$/, '')
  }

  // ── Public API ──────────────────────────────────────────────────────

  /** The deals namespace — `create`, `resume`, and `list`. */
  get deals() {
    return {
      create: (data: CreateDealRequest): Promise<Deal> => this._createDeal(data),
      resume: (dealId: string): Promise<Deal> => this._resumeDeal(dealId),
      list: (filters?: DealListFilters): Promise<DealListResponse> => this._listDeals(filters),
    }
  }

  // ── Internal API Methods ────────────────────────────────────────────

  private async _createDeal(data: CreateDealRequest): Promise<Deal> {
    // Validate input before making the request
    if (!data.type || !VALID_DEAL_TYPES.includes(data.type)) {
      throw new DealflowError(
        `type must be one of: ${VALID_DEAL_TYPES.join(', ')}`,
        'INVALID_REQUEST',
        400,
      )
    }
    if (!data.intent || typeof data.intent !== 'string' || data.intent.trim().length === 0) {
      throw new DealflowError('intent must be a non-empty string', 'INVALID_REQUEST', 400)
    }

    const response = await this._request<{ deal: DealData }>('POST', '/api/v1/deals', data)
    return new Deal(response.deal, this)
  }

  private async _resumeDeal(dealId: string): Promise<Deal> {
    if (!dealId || typeof dealId !== 'string' || dealId.trim().length === 0) {
      throw new DealflowError('dealId must be a non-empty string', 'INVALID_REQUEST', 400)
    }

    const response = await this._request<{ deal: DealData }>('GET', `/api/v1/deals/${dealId}`)
    return new Deal(response.deal, this)
  }

  private async _listDeals(filters?: DealListFilters): Promise<DealListResponse> {
    const params = new URLSearchParams()

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null) continue
        if (Array.isArray(value)) {
          params.set(key, value.join(','))
        } else {
          params.set(key, String(value))
        }
      }
    }

    const query = params.toString()
    const path = query ? `/api/v1/deals?${query}` : '/api/v1/deals'
    return this._request<DealListResponse>('GET', path)
  }

  // ── HTTP Layer ──────────────────────────────────────────────────────

  /**
   * Make an authenticated HTTP request to the Dealflow API.
   * @internal — exposed for Deal class, not part of the public API.
   */
  async _request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    } catch {
      throw new DealflowError(
        'Network error — could not reach Dealflow API',
        'NETWORK_ERROR',
        0,
      )
    }

    if (!response.ok) {
      let errorBody: Record<string, unknown>
      try {
        errorBody = (await response.json()) as Record<string, unknown>
      } catch {
        throw new DealflowError(
          `HTTP ${response.status}: ${response.statusText}`,
          'UNKNOWN_ERROR',
          response.status,
        )
      }
      throw DealflowError.fromResponse(errorBody as { error?: string; code?: string; status?: number })
    }

    return (await response.json()) as T
  }
}

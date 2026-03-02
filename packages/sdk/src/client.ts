import { DealflowError } from './errors.js'
import { Deal } from './deal.js'
import type { CreateDealRequest, DealDashboardResponse, DealData, DealFilters, DealListResponse } from './types.js'

export class Dealflow {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(config: { apiKey: string; baseUrl?: string }) {
    if (!config.apiKey) {
      throw new Error('Dealflow: apiKey is required')
    }

    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl ?? 'https://api.dealflow.dev'
  }

  get deals() {
    return {
      create: (data: CreateDealRequest) => this._createDeal(data),
      resume: (dealId: string) => this._resumeDeal(dealId),
      list: (filters?: DealFilters) => this._listDeals(filters),
    }
  }

  get dashboard() {
    return {
      summary: () => this._dashboardSummary(),
    }
  }

  private async _createDeal(data: CreateDealRequest): Promise<Deal> {
    const response = await this._request<{ deal: DealData }>('POST', '/api/v1/deals', data)
    return new Deal(response.deal, this)
  }

  private async _resumeDeal(dealId: string): Promise<Deal> {
    const response = await this._request<{ deal: DealData }>('GET', `/api/v1/deals/${dealId}`)
    return new Deal(response.deal, this)
  }

  private async _listDeals(filters?: DealFilters): Promise<DealListResponse> {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(filters ?? {})) {
      if (value !== undefined) params.set(key, String(value))
    }

    return this._request<DealListResponse>('GET', `/api/v1/deals?${params.toString()}`)
  }

  private async _dashboardSummary(): Promise<DealDashboardResponse> {
    return this._request<DealDashboardResponse>('GET', '/api/v1/dashboard')
  }

  async _request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = (await response.json()) as { error?: string; message?: string; code?: string }
      throw new DealflowError(error.error ?? error.message ?? 'Unknown API error', response.status, error.code)
    }

    return (await response.json()) as T
  }
}

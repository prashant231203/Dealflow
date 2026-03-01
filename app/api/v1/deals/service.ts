import { createDealId } from '../../../../lib/deals/ids.js'
import { ok } from '../../../../lib/utils/response.js'
import { validateCreateDealRequest } from '../../../../lib/utils/validation.js'
import type { CreateDealRequest, DealData, DealFilters, DealListResponse } from '../../../../types/index.js'

export function createDeal(input: CreateDealRequest, developerId: string): { deal: DealData } {
  validateCreateDealRequest(input)

  const now = new Date().toISOString()
  const expires_at = input.expires_in ? new Date(Date.now() + input.expires_in * 1000).toISOString() : undefined
  return {
    deal: {
      id: createDealId(),
      developer_id: developerId,
      type: input.type,
      intent: input.intent,
      status: 'active',
      parties: input.parties ?? [],
      constraints: input.constraints ?? {},
      compliance_flags: [],
      metadata: input.metadata ?? {},
      tags: input.tags ?? [],
      created_at: now,
      updated_at: now,
      expires_at,
      current_best_offer: null,
      current_summary: `Deal created for intent: ${input.intent}`,
      offers: [],
      history: [],
    },
  }
}

function applyFilters(deals: DealData[], filters: DealFilters): DealData[] {
  let result = [...deals]

  if (filters.status) result = result.filter((deal) => deal.status === filters.status)
  if (filters.type) result = result.filter((deal) => deal.type === filters.type)
  if (filters.current_handler) result = result.filter((deal) => deal.current_handler === filters.current_handler)

  if (filters.tags) {
    const tags = filters.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    result = result.filter((deal) => tags.every((tag) => deal.tags.includes(tag)))
  }

  if (filters.created_after) {
    const afterDate = new Date(filters.created_after)
    result = result.filter((deal) => new Date(deal.created_at) >= afterDate)
  }

  if (filters.created_before) {
    const beforeDate = new Date(filters.created_before)
    result = result.filter((deal) => new Date(deal.created_at) <= beforeDate)
  }

  if (filters.search) {
    const needle = filters.search.toLowerCase()
    result = result.filter((deal) => deal.intent.toLowerCase().includes(needle))
  }

  return result
}

export function listDeals(
  deals: DealData[],
  filters: DealFilters = {},
  page = 1,
  perPage = 20,
): ReturnType<typeof ok<DealListResponse>> {
  const safePerPage = Math.max(1, Math.min(perPage, 100))
  const safePage = Math.max(1, page)

  const filtered = applyFilters(deals, filters)
  const offset = (safePage - 1) * safePerPage
  const paged = filtered.slice(offset, offset + safePerPage)
  return ok({ deals: paged, total: filtered.length, page: safePage, per_page: safePerPage })
}

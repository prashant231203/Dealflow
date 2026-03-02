import { authenticateRequest } from '../../../../lib/auth/middleware.js'
import { invalidApiKeyResponse, json } from '../../../../lib/utils/http.js'
import { memoryStore } from '../../../../lib/store/in-memory.js'
import type { DealDashboardResponse } from '../../../../types/index.js'

export async function GET(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request)
  if (!auth) return invalidApiKeyResponse()

  const deals = memoryStore.deals.filter((deal) => deal.developer_id === auth.developer.id)
  const activeDeals = deals.filter((deal) => deal.status === 'active').length
  const pausedDeals = deals.filter((deal) => deal.status === 'paused').length
  const escalatedDeals = deals.filter((deal) => deal.status === 'escalated').length
  const closedDeals = deals.filter((deal) => deal.status === 'closed').length
  const criticalFlags = deals.reduce(
    (count, deal) => count + deal.compliance_flags.filter((flag) => flag.severity === 'critical').length,
    0,
  )

  const recentDeals = [...deals]
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, 10)

  const response: DealDashboardResponse = {
    totals: {
      deals: deals.length,
      active_deals: activeDeals,
      paused_deals: pausedDeals,
      escalated_deals: escalatedDeals,
      closed_deals: closedDeals,
      critical_flags: criticalFlags,
    },
    recent_deals: recentDeals,
  }

  return json(response)
}

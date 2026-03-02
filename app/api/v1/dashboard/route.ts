import { authenticateRequest } from '../../../../lib/auth/middleware'
import { invalidApiKeyResponse, json, handleRouteError } from '../../../../lib/utils/http'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request)
  if (!auth) return invalidApiKeyResponse()

  try {
    const { data: deals, error } = await supabaseAdmin
      .from('deals')
      .select('*')
      .eq('developer_id', auth.developer.id)

    if (error) throw error

    const activeDeals = deals.filter((deal) => deal.status === 'active').length
    const pausedDeals = deals.filter((deal) => deal.status === 'paused').length
    const escalatedDeals = deals.filter((deal) => deal.status === 'escalated').length
    const closedDeals = deals.filter((deal) => deal.status === 'closed').length

    const criticalFlags = deals.reduce(
      (count, deal) => count + (deal.compliance_flags?.filter((flag: any) => flag.severity === 'critical').length ?? 0),
      0,
    )

    const recentDeals = [...deals]
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
      .slice(0, 10)

    return json({
      totals: {
        deals: deals.length,
        active_deals: activeDeals,
        paused_deals: pausedDeals,
        escalated_deals: escalatedDeals,
        closed_deals: closedDeals,
        critical_flags: criticalFlags,
      },
      recent_deals: recentDeals,
    })
  } catch (error) {
    return handleRouteError(error)
  }
}

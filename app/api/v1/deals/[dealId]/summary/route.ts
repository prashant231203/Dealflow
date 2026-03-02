import { authenticateRequest } from '../../../../../../lib/auth/middleware'
import { generateDealSummary } from '../../../../../../lib/intelligence/summary'
import { errorResponse, invalidApiKeyResponse, json, handleRouteError } from '../../../../../../lib/utils/http'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: Request,
  context: { params: Promise<{ dealId: string }> },
): Promise<Response> {
  const { dealId } = await context.params
  const auth = await authenticateRequest(request)
  if (!auth) return invalidApiKeyResponse()

  try {
    const [
      { data: deal, error: dealError },
      { data: offers, error: offersError },
      { data: events, error: eventsError }
    ] = await Promise.all([
      supabaseAdmin.from('deals').select('*').eq('id', dealId).eq('developer_id', auth.developer.id).single(),
      supabaseAdmin.from('deal_offers').select('*').eq('deal_id', dealId).eq('status', 'pending'),
      supabaseAdmin.from('deal_events').select('*').eq('deal_id', dealId).order('sequence_number', { ascending: false }).limit(10)
    ])

    if (dealError || !deal) return errorResponse('Deal not found', 'DEAL_NOT_FOUND', 404)
    if (offersError) throw offersError
    if (eventsError) throw eventsError

    const summary = await generateDealSummary(deal, (events ?? []).reverse(), offers ?? [])
    return json({ summary })
  } catch (error) {
    return handleRouteError(error)
  }
}

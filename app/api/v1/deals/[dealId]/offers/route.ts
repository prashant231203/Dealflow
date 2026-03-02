import { authenticateRequest } from '../../../../../../lib/auth/middleware'
import { errorResponse, invalidApiKeyResponse, json } from '../../../../../../lib/utils/http'
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

  // Verify deal exists and belongs to developer
  const { data: deal, error: dealError } = await supabaseAdmin
    .from('deals')
    .select('id')
    .eq('id', dealId)
    .eq('developer_id', auth.developer.id)
    .single()

  if (dealError || !deal) return errorResponse('Deal not found', 'DEAL_NOT_FOUND', 404)

  const { data: offers, error: offersError } = await supabaseAdmin
    .from('deal_offers')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })

  if (offersError) {
    return json({ error: offersError.message }, 500)
  }

  return json({ offers: offers ?? [] })
}

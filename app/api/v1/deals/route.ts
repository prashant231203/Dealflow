import { authenticateRequest } from '../../../../lib/auth/middleware'
import { generateDealSummary } from '../../../../lib/intelligence/summary'
import { handleRouteError, invalidApiKeyResponse, json, parseJson, errorResponse } from '../../../../lib/utils/http'
import { ApiError } from '../../../../lib/utils/response'
import type { CreateDealRequest } from '../../../../types/index'
import { fireWebhooks } from '../../../../lib/webhooks/delivery'
import { createClient } from '@supabase/supabase-js'
import { createDealId } from '../../../../lib/deals/ids'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request)
  if (!auth) return invalidApiKeyResponse()

  try {
    const body = await parseJson<CreateDealRequest>(request)
    const dealId = createDealId()
    const now = new Date().toISOString()

    // Create the initial deal record
    const { data: deal, error: insertError } = await supabaseAdmin
      .from('deals')
      .insert({
        id: dealId,
        developer_id: auth.developer.id,
        type: body.type,
        intent: body.intent,
        status: 'active',
        parties: body.parties ?? [],
        constraints: body.constraints ?? {},
        metadata: body.metadata ?? {},
        tags: body.tags ?? [],
        created_at: now,
        updated_at: now,
        expires_at: body.expires_in ? new Date(Date.now() + body.expires_in * 1000).toISOString() : null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    const initialSummary = await generateDealSummary(deal, [], [], 'created', auth.developer.id)

    // Update with summary and create initial event
    await Promise.all([
      supabaseAdmin.from('deals').update({ current_summary: initialSummary }).eq('id', dealId),
      supabaseAdmin.from('deal_events').insert({
        deal_id: dealId,
        action: 'created',
        actor: 'system',
        payload: body,
        summary_after: initialSummary,
        sequence_number: 0
      })
    ])

    // Fire webhooks asynchronously — do not await
    fireWebhooks(auth.developer.id, dealId, 'deal.created', deal, ['deal.active'])

    return json({ deal: { ...deal, current_summary: initialSummary } }, 201)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function GET(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request)
  if (!auth) return invalidApiKeyResponse()

  try {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const perPage = Number(url.searchParams.get('per_page') ?? '20')

    let query = supabaseAdmin
      .from('deals')
      .select('*', { count: 'exact' })
      .eq('developer_id', auth.developer.id)
      .order('created_at', { ascending: false })

    // Apply filters
    const status = url.searchParams.get('status')
    if (status) query = query.eq('status', status)

    const type = url.searchParams.get('type')
    if (type) query = query.eq('type', type)

    const search = url.searchParams.get('search')
    if (search) query = query.ilike('intent', `%${search}%`)

    // PPP Discovery Support (metadata. / constraints.)
    for (const [key, value] of Array.from(url.searchParams.entries())) {
      if (key.startsWith('metadata.') || key.startsWith('constraints.')) {
        // Expected format for value: "operator:number/string" e.g., "gte:1000" or just direct eq value e.g "custom_req"
        const [column, ...pathSegments] = key.split('.')
        const jsonPath = pathSegments.join('->')

        const parts = value.split(':')
        if (parts.length === 2 && ['eq', 'gt', 'lt', 'gte', 'lte'].includes(parts[0])) {
          const [operator, valStr] = parts
          const val = isNaN(Number(valStr)) ? valStr : Number(valStr)

          if (operator === 'gt') query = query.gt(`${column}->>${jsonPath}`, val)
          else if (operator === 'lt') query = query.lt(`${column}->>${jsonPath}`, val)
          else if (operator === 'gte') query = query.gte(`${column}->>${jsonPath}`, val)
          else if (operator === 'lte') query = query.lte(`${column}->>${jsonPath}`, val)
          else query = query.eq(`${column}->>${jsonPath}`, val)
        } else {
          // Default to exact match
          query = query.eq(`${column}->>${jsonPath}`, value)
        }
      }
    }

    const { data: deals, count, error } = await query.range((page - 1) * perPage, page * perPage - 1)

    if (error) throw error

    return json({
      deals: deals ?? [],
      total: count ?? 0,
      page,
      per_page: perPage
    }, 200)
  } catch (error) {
    return handleRouteError(error)
  }
}

export function methodNotAllowed(): Response {
  return errorResponse('Method not allowed', 'VALIDATION_ERROR', 400)
}

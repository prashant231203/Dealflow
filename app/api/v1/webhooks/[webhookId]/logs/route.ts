import { authenticateRequest } from '../../../../../../lib/auth/middleware'
import { errorResponse, handleRouteError, invalidApiKeyResponse, json } from '../../../../../../lib/utils/http'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request, { params }: { params: Promise<{ webhookId: string }> }): Promise<Response> {
    const { webhookId } = await params
    const auth = await authenticateRequest(request)
    if (!auth) return invalidApiKeyResponse()

    try {
        const { data: webhook, error: webhookError } = await supabaseAdmin
            .from('webhooks')
            .select('id')
            .eq('id', webhookId)
            .eq('developer_id', auth.developer.id)
            .single()

        if (webhookError || !webhook) return errorResponse('Webhook not found', 'NOT_FOUND', 404)

        const url = new URL(request.url)
        const page = Number(url.searchParams.get('page') ?? '1')
        const perPage = Number(url.searchParams.get('per_page') ?? '50')
        const succeededParam = url.searchParams.get('succeeded')

        let query = supabaseAdmin
            .from('webhook_deliveries')
            .select('*', { count: 'exact' })
            .eq('webhook_id', webhookId)
            .order('created_at', { ascending: false })

        if (succeededParam !== null) {
            query = query.eq('succeeded', succeededParam === 'true')
        }

        const { data: logs, count, error } = await query.range((page - 1) * perPage, page * perPage - 1)

        if (error) throw error

        return json({
            logs: logs ?? [],
            total: count ?? 0,
            page,
            per_page: perPage
        })
    } catch (error) {
        return handleRouteError(error)
    }
}

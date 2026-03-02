import { authenticateRequest } from '../../../../../../lib/auth/middleware'
import { errorResponse, handleRouteError, invalidApiKeyResponse, json } from '../../../../../../lib/utils/http'
import { deliverToWebhook } from '../../../../../../lib/webhooks/delivery'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request, { params }: { params: Promise<{ webhookId: string }> }): Promise<Response> {
    const { webhookId } = await params
    const auth = await authenticateRequest(request)
    if (!auth) return invalidApiKeyResponse()

    try {
        const { data: webhook, error } = await supabaseAdmin
            .from('webhooks')
            .select('*')
            .eq('id', webhookId)
            .eq('developer_id', auth.developer.id)
            .single()

        if (error || !webhook) return errorResponse('Webhook not found', 'NOT_FOUND', 404)

        const payload = {
            id: crypto.randomUUID(),
            event: 'deal.test_event',
            created_at: new Date().toISOString(),
            api_version: 'v1',
            is_test: true,
            data: {
                deal: { id: 'test_deal', status: 'active', summary: 'This is a test deal' },
                action: 'test',
                actor: 'developer'
            }
        }

        const succeeded = await deliverToWebhook(webhook, payload, 1)

        return json({
            success: succeeded,
            message: succeeded ? 'Test event delivered successfully' : 'Test event delivery failed. Check logs.',
            delivery_id: payload.id
        })
    } catch (error) {
        return handleRouteError(error)
    }
}

import { authenticateRequest } from '../../../../../lib/auth/middleware'
import { errorResponse, handleRouteError, invalidApiKeyResponse, json, parseJson } from '../../../../../lib/utils/http'
import { validateWebhookUrl, validateWebhookEvents } from '../route'
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
        const { data: webhook, error } = await supabaseAdmin
            .from('webhooks')
            .select('id, developer_id, url, events, description, is_active, created_at, last_triggered_at')
            .eq('id', webhookId)
            .eq('developer_id', auth.developer.id)
            .single()

        if (error || !webhook) return errorResponse('Webhook not found', 'NOT_FOUND', 404)

        return json(webhook)
    } catch (error) {
        return handleRouteError(error)
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ webhookId: string }> }): Promise<Response> {
    const { webhookId } = await params
    const auth = await authenticateRequest(request)
    if (!auth) return invalidApiKeyResponse()

    try {
        const body = await parseJson<{ url?: string, events?: string[], description?: string, is_active?: boolean }>(request)
        const updates: any = {}

        if (body.url !== undefined) {
            validateWebhookUrl(body.url)
            updates.url = body.url
        }

        if (body.events !== undefined) {
            validateWebhookEvents(body.events)
            updates.events = body.events
        }

        if (body.description !== undefined) updates.description = body.description
        if (body.is_active !== undefined) updates.is_active = body.is_active

        updates.updated_at = new Date().toISOString()

        const { data: webhook, error } = await supabaseAdmin
            .from('webhooks')
            .update(updates)
            .eq('id', webhookId)
            .eq('developer_id', auth.developer.id)
            .select('id, developer_id, url, events, description, is_active, created_at, last_triggered_at')
            .single()

        if (error || !webhook) return errorResponse('Webhook not found or update failed', 'NOT_FOUND', 404)

        return json(webhook)
    } catch (error) {
        return handleRouteError(error)
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ webhookId: string }> }): Promise<Response> {
    const { webhookId } = await params
    const auth = await authenticateRequest(request)
    if (!auth) return invalidApiKeyResponse()

    try {
        const { error } = await supabaseAdmin
            .from('webhooks')
            .delete()
            .eq('id', webhookId)
            .eq('developer_id', auth.developer.id)

        if (error) throw error

        return json({ success: true, message: 'Webhook deleted' })
    } catch (error) {
        return handleRouteError(error)
    }
}

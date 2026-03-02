import { authenticateRequest } from '../../../../../lib/auth/middleware.js'
import { errorResponse, handleRouteError, invalidApiKeyResponse, json, parseJson } from '../../../../../lib/utils/http.js'
import { memoryStore } from '../../../../../lib/store/in-memory.js'
import { validateWebhookUrl, validateWebhookEvents } from '../route.js'

export async function GET(request: Request, { params }: { params: { webhookId: string } }): Promise<Response> {
    const auth = await authenticateRequest(request)
    if (!auth) return invalidApiKeyResponse()

    try {
        const webhook = memoryStore.webhooks.find(w => w.id === params.webhookId && w.developer_id === auth.developer.id)
        if (!webhook) return errorResponse('Webhook not found', 'NOT_FOUND', 404)

        const { secret, ...rest } = webhook
        return json(rest)
    } catch (error) {
        return handleRouteError(error)
    }
}

export async function PATCH(request: Request, { params }: { params: { webhookId: string } }): Promise<Response> {
    const auth = await authenticateRequest(request)
    if (!auth) return invalidApiKeyResponse()

    try {
        const webhook = memoryStore.webhooks.find(w => w.id === params.webhookId && w.developer_id === auth.developer.id)
        if (!webhook) return errorResponse('Webhook not found', 'NOT_FOUND', 404)

        const body = await parseJson<{ url?: string, events?: string[], description?: string, is_active?: boolean }>(request)

        if (body.url !== undefined) {
            try {
                validateWebhookUrl(body.url)
                webhook.url = body.url
            } catch (e: any) {
                return errorResponse(e.message, 'INVALID_WEBHOOK_URL', 400)
            }
        }

        if (body.events !== undefined) {
            try {
                validateWebhookEvents(body.events)
                webhook.events = body.events
            } catch (e: any) {
                return errorResponse(e.message, 'VALIDATION_ERROR', 400)
            }
        }

        if (body.description !== undefined) webhook.description = body.description
        if (body.is_active !== undefined) webhook.is_active = body.is_active

        const { secret, ...rest } = webhook
        return json(rest)
    } catch (error) {
        return handleRouteError(error)
    }
}

export async function DELETE(request: Request, { params }: { params: { webhookId: string } }): Promise<Response> {
    const auth = await authenticateRequest(request)
    if (!auth) return invalidApiKeyResponse()

    try {
        const index = memoryStore.webhooks.findIndex(w => w.id === params.webhookId && w.developer_id === auth.developer.id)
        if (index === -1) return errorResponse('Webhook not found', 'NOT_FOUND', 404)

        const webhookId = memoryStore.webhooks[index].id
        memoryStore.webhooks.splice(index, 1)

        // Cascade delete logs & retry queue
        memoryStore.webhook_deliveries = memoryStore.webhook_deliveries.filter(l => l.webhook_id !== webhookId)
        memoryStore.webhook_retry_queue = memoryStore.webhook_retry_queue.filter(q => q.webhook_id !== webhookId)

        return json({ success: true, message: 'Webhook deleted' })
    } catch (error) {
        return handleRouteError(error)
    }
}

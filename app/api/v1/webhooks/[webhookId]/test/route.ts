import { authenticateRequest } from '../../../../../../lib/auth/middleware.js'
import { errorResponse, handleRouteError, invalidApiKeyResponse, json } from '../../../../../../lib/utils/http.js'
import { memoryStore } from '../../../../../../lib/store/in-memory.js'
import { deliverToWebhook } from '../../../../../../lib/webhooks/delivery.js'
import crypto from 'node:crypto'

export async function POST(request: Request, { params }: { params: { webhookId: string } }): Promise<Response> {
    const auth = await authenticateRequest(request)
    if (!auth) return invalidApiKeyResponse()

    try {
        const webhook = memoryStore.webhooks.find(w => w.id === params.webhookId && w.developer_id === auth.developer.id)
        if (!webhook) return errorResponse('Webhook not found', 'NOT_FOUND', 404)

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

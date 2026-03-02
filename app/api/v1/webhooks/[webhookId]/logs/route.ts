import { authenticateRequest } from '../../../../../../lib/auth/middleware.js'
import { errorResponse, handleRouteError, invalidApiKeyResponse, json } from '../../../../../../lib/utils/http.js'
import { memoryStore } from '../../../../../../lib/store/in-memory.js'

export async function GET(request: Request, { params }: { params: { webhookId: string } }): Promise<Response> {
    const auth = await authenticateRequest(request)
    if (!auth) return invalidApiKeyResponse()

    try {
        const webhook = memoryStore.webhooks.find(w => w.id === params.webhookId && w.developer_id === auth.developer.id)
        if (!webhook) return errorResponse('Webhook not found', 'NOT_FOUND', 404)

        const url = new URL(request.url)
        const page = Number(url.searchParams.get('page') ?? '1')
        const perPage = Number(url.searchParams.get('per_page') ?? '50')
        const succeededParam = url.searchParams.get('succeeded')

        let logs = memoryStore.webhook_deliveries.filter(l => l.webhook_id === webhook.id)

        if (succeededParam !== null) {
            const wantSuccess = succeededParam === 'true'
            logs = logs.filter(l => l.succeeded === wantSuccess)
        }

        logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        const total = logs.length
        const start = (page - 1) * perPage
        const end = start + perPage
        const paginated = logs.slice(start, end)

        return json({
            logs: paginated,
            total,
            page,
            per_page: perPage
        })
    } catch (error) {
        return handleRouteError(error)
    }
}

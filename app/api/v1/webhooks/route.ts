import { authenticateRequest } from '../../../../lib/auth/middleware.js'
import { errorResponse, handleRouteError, invalidApiKeyResponse, json, parseJson } from '../../../../lib/utils/http.js'
import { memoryStore } from '../../../../lib/store/in-memory.js'
import type { WebhookRecord } from '../../../../types/index.js'
import crypto from 'node:crypto'

export const VALID_WEBHOOK_EVENTS = new Set([
    'deal.*',
    'deal.created',
    'deal.status_changed',
    'deal.active',
    'deal.paused',
    'deal.escalated',
    'deal.closed',
    'deal.expired',
    'deal.cancelled',
    'deal.offer.created',
    'deal.offer.accepted',
    'deal.offer.rejected',
    'deal.offer.withdrawn',
    'deal.compliance.flagged',
    'deal.compliance.critical',
    'deal.note.added',
    'deal.escalated.to'
])

export function validateWebhookUrl(urlStr: string) {
    let url: URL
    try {
        url = new URL(urlStr)
    } catch {
        throw new Error('Invalid URL format')
    }

    if (url.protocol === 'http:') {
        if (!['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) {
            throw new Error('Webhook URLs must use HTTPS (HTTP is only allowed for localhost)')
        }
    } else if (url.protocol !== 'https:') {
        throw new Error('Webhook URLs must use HTTPS')
    }
}

export function validateWebhookEvents(events: string[]) {
    if (!Array.isArray(events) || events.length === 0) {
        throw new Error('events must be a non-empty array')
    }
    for (const e of events) {
        if (!VALID_WEBHOOK_EVENTS.has(e)) {
            throw new Error(`Invalid event name: ${e}`)
        }
    }
}

export async function POST(request: Request): Promise<Response> {
    const auth = await authenticateRequest(request)
    if (!auth) return invalidApiKeyResponse()

    try {
        const body = await parseJson<{ url: string, events: string[], description?: string }>(request)

        try {
            validateWebhookUrl(body.url)
        } catch (e: any) {
            return errorResponse(e.message, 'INVALID_WEBHOOK_URL', 400)
        }

        try {
            validateWebhookEvents(body.events)
        } catch (e: any) {
            return errorResponse(e.message, 'VALIDATION_ERROR', 400)
        }

        const secret = crypto.randomBytes(32).toString('hex')
        const webhook: WebhookRecord = {
            id: crypto.randomUUID(),
            developer_id: auth.developer.id,
            url: body.url,
            events: body.events,
            secret,
            is_active: true,
            description: body.description,
            created_at: new Date().toISOString()
        }

        memoryStore.webhooks.push(webhook)

        return json({
            ...webhook,
            secret_note: 'Store this secret securely. It will not be shown again.'
        }, 201)

    } catch (error) {
        return handleRouteError(error)
    }
}

export async function GET(request: Request): Promise<Response> {
    const auth = await authenticateRequest(request)
    if (!auth) return invalidApiKeyResponse()

    try {
        const url = new URL(request.url)
        const isActiveParam = url.searchParams.get('is_active')

        let whs = memoryStore.webhooks.filter(w => w.developer_id === auth.developer.id)

        if (isActiveParam !== null) {
            const wantActive = isActiveParam === 'true'
            whs = whs.filter(w => w.is_active === wantActive)
        }

        // Omit secret
        const results = whs.map(({ secret, ...rest }) => rest)
        return json({ webhooks: results }, 200)

    } catch (error) {
        return handleRouteError(error)
    }
}

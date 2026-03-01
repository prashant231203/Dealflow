import { createHmac, randomUUID } from 'node:crypto'

export interface WebhookEventPayload {
  event: string
  timestamp: string
  deal: Record<string, unknown>
  action?: Record<string, unknown>
}

export interface WebhookDeliveryResult {
  deliveryId: string
  success: boolean
  status?: number
  responseBody?: string
}

export function signWebhookPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export async function deliverWebhook(
  url: string,
  secret: string,
  event: string,
  payload: WebhookEventPayload,
): Promise<WebhookDeliveryResult> {
  const body = JSON.stringify(payload)
  const deliveryId = randomUUID()
  const signature = signWebhookPayload(body, secret)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Dealflow-Signature': signature,
      'X-Dealflow-Event': event,
      'X-Dealflow-Delivery-ID': deliveryId,
    },
    body,
  })

  return {
    deliveryId,
    success: response.ok,
    status: response.status,
    responseBody: await response.text(),
  }
}

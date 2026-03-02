import crypto from 'node:crypto'
import { memoryStore } from '../store/in-memory.js'
import type { DealData, ComplianceFlag, WebhookRecord, WebhookDeliveryRecord } from '../../types/index.js'

export function mapActionToEvents(action: string, deal: DealData, complianceFlags: ComplianceFlag[]): string[] {
  const events = new Set<string>()

  const checkStatusChange = () => {
    // If status changed, we fire deal.status_changed
    // In our simplified mock, we assume certain actions explicitly mutate status.
    const isStatusMutatingAction = ['accept', 'pause', 'resume_process', 'escalate', 'reassign', 'close', 'cancel'].includes(action)
    if (isStatusMutatingAction) events.add('deal.status_changed')
  }

  // 1. Action mappings
  switch (action) {
    case 'offer':
    case 'counter':
      events.add('deal.offer.created')
      break
    case 'accept':
      events.add('deal.offer.accepted')
      checkStatusChange()
      break
    case 'reject':
      events.add('deal.offer.rejected')
      break
    case 'withdraw':
      events.add('deal.offer.withdrawn')
      break
    case 'pause':
      events.add('deal.paused')
      checkStatusChange()
      break
    case 'resume_process':
      events.add('deal.active')
      checkStatusChange()
      break
    case 'escalate':
      events.add('deal.escalated')
      events.add('deal.escalated.to') // notifies receiving handler implicitly
      checkStatusChange()
      break
    case 'reassign':
      checkStatusChange()
      break
    case 'close':
      events.add('deal.closed')
      checkStatusChange()
      break
    case 'cancel':
      events.add('deal.cancelled')
      checkStatusChange()
      break
    case 'note':
      events.add('deal.note.added')
      break
  }

  // 2. Compliance flag mappings
  if (complianceFlags?.length > 0) {
    events.add('deal.compliance.flagged')
    const hasCritical = complianceFlags.some(f => f.severity === 'critical')
    if (hasCritical) {
      events.add('deal.compliance.critical')
    }
  }

  return Array.from(events)
}

/**
 * Async entrypoint. Must have return type void, not Promise<void>. 
 * It starts async work internally. The caller must never be able to await it.
 */
export function fireWebhooks(
  developerId: string,
  dealId: string,
  event: string,
  dealData: DealData,
  additionalEvents?: string[]
): void {
  // Start async work without returning the promise
  void (async () => {
    try {
      if (!developerId || !dealId || !event || !dealData) return

      // Find relevant webhooks
      const allWebhooksForDev = memoryStore.webhooks.filter(w => w.developer_id === developerId && w.is_active)

      const processEvent = async (eventName: string) => {
        const relevantWebhooks = allWebhooksForDev.filter(w =>
          w.events.includes('deal.*') || w.events.includes(eventName)
        )

        if (relevantWebhooks.length === 0) return

        // Compute action/actor and changes from latest history entry
        const historyLength = dealData.history?.length || 0
        const latestEvent = historyLength > 0 ? dealData.history![historyLength - 1] : null
        const action = latestEvent?.action || 'unknown'
        const actor = latestEvent?.actor || 'system'

        const payloadChanges: Record<string, unknown> = {}

        // Status changes best-estimate
        if (eventName === 'deal.status_changed' && historyLength >= 2) {
          // We can't perfectly reconstruct the old status without a dedicated field,
          // but we'll try to find the previous status in the history log if possible
          payloadChanges.status = { to: dealData.status, from: 'unknown' }
        }

        // Include current offer if it's an offer event
        if (eventName.startsWith('deal.offer.') && dealData.offers?.length) {
          payloadChanges.offer = dealData.offers[dealData.offers.length - 1]
        }

        // Include latest flag if compliance event
        if (eventName.startsWith('deal.compliance.') && dealData.compliance_flags?.length) {
          payloadChanges.compliance_flag = dealData.compliance_flags[dealData.compliance_flags.length - 1]
        }

        const payloadObj = {
          id: crypto.randomUUID(),
          event: eventName,
          created_at: new Date().toISOString(),
          api_version: 'v1',
          is_test: false,
          data: {
            deal: dealData,
            action,
            actor,
            ...(Object.keys(payloadChanges).length > 0 ? { changes: payloadChanges } : {})
          }
        }

        // Deliver
        const promises = relevantWebhooks.map(webhook => deliverToWebhook(webhook, payloadObj, 1))
        await Promise.allSettled(promises)
      }

      const eventsQueue = [event, ...(additionalEvents || [])]
      for (const e of eventsQueue) {
        await processEvent(e)
      }

    } catch (err) {
      // Catch all non-network errors during payload assembly so we never crash the process
      console.error('Unhandled error in fireWebhooks:', err)
    }
  })()
}

export async function deliverToWebhook(
  webhook: WebhookRecord,
  payload: Record<string, unknown>,
  attemptNumber: number
): Promise<boolean> {
  const payloadString = JSON.stringify(payload)

  // Create HMAC-SHA256 signature
  const signature = 'sha256=' + crypto.createHmac('sha256', webhook.secret).update(payloadString).digest('hex')
  const timestamp = Math.floor(Date.now() / 1000).toString()

  const deliveryLog: WebhookDeliveryRecord = {
    id: crypto.randomUUID(),
    webhook_id: webhook.id,
    deal_id: (payload.data as any)?.deal?.id,
    event: payload.event as string,
    payload: payload,
    attempt_number: attemptNumber,
    created_at: new Date().toISOString()
  }

  const startTime = Date.now()
  let isSuccess = false

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dealflow-Signature': signature,
        'X-Dealflow-Event': payload.event as string,
        'X-Dealflow-Delivery-ID': payload.id as string,
        'X-Dealflow-Timestamp': timestamp,
        'User-Agent': 'Dealflow-Webhooks/1.0'
      },
      body: payloadString,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    deliveryLog.response_status = response.status
    const text = await response.text().catch(() => '')
    deliveryLog.response_body = text.substring(0, 1000)
    isSuccess = response.ok

  } catch (err: any) {
    isSuccess = false
    deliveryLog.error_message = err.name === 'AbortError' ? 'Request Timeout (10s)' : (err.message || 'Network error')
  }

  deliveryLog.duration_ms = Date.now() - startTime
  deliveryLog.succeeded = isSuccess
  deliveryLog.delivered_at = new Date().toISOString()

  // Save to DB (memoryStore)
  memoryStore.webhook_deliveries.push(deliveryLog)

  if (attemptNumber === 1) {
    webhook.last_triggered_at = deliveryLog.delivered_at
  }

  // Handle retry logic
  if (!isSuccess) {
    const retryDelays = [30 * 1000, 5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000] // 30s, 5m, 30m, 2h

    // attemptNumber corresponds to indices 0 (try 1), 1 (try 2), etc.
    // If attemptNumber < 5, we have retries left (max 5 attempts -> attemptNumber 1,2,3,4,5)
    if (attemptNumber < 5) {
      const waitMs = retryDelays[attemptNumber - 1]
      const nextAttemptTime = new Date(Date.now() + waitMs).toISOString()

      memoryStore.webhook_retry_queue.push({
        id: crypto.randomUUID(),
        webhook_id: webhook.id,
        deal_id: deliveryLog.deal_id,
        payload: payload,
        event: deliveryLog.event,
        next_attempt_number: attemptNumber + 1,
        retry_after: nextAttemptTime,
        created_at: new Date().toISOString()
      })
    }
  }

  return isSuccess
}

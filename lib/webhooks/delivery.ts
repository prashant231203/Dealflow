import crypto from 'node:crypto'
import type { DealData, ComplianceFlag, WebhookRecord } from '../../types/index'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export function mapActionToEvents(action: string, deal: DealData, complianceFlags: ComplianceFlag[]): string[] {
  const events = new Set<string>()

  const checkStatusChange = () => {
    const isStatusMutatingAction = ['accept', 'pause', 'resume_process', 'escalate', 'reassign', 'close', 'cancel'].includes(action)
    if (isStatusMutatingAction) events.add('deal.status_changed')
  }

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
      events.add('deal.escalated.to')
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

  if (complianceFlags?.length > 0) {
    events.add('deal.compliance.flagged')
    const hasCritical = complianceFlags.some(f => f.severity === 'critical')
    if (hasCritical) {
      events.add('deal.compliance.critical')
    }
  }

  return Array.from(events)
}

export function fireWebhooks(
  developerId: string,
  dealId: string,
  event: string,
  dealData: DealData,
  additionalEvents?: string[]
): void {
  void (async () => {
    try {
      if (!developerId || !dealId || !event || !dealData) return

      // Find relevant webhooks in Supabase
      const { data: allWebhooks, error: hookError } = await supabaseAdmin
        .from('webhooks')
        .select('*')
        .eq('developer_id', developerId)
        .eq('is_active', true)

      if (hookError || !allWebhooks || allWebhooks.length === 0) return

      const processEvent = async (eventName: string) => {
        const relevantWebhooks = allWebhooks.filter(w =>
          w.events.includes('deal.*') || w.events.includes(eventName)
        )

        if (relevantWebhooks.length === 0) return

        const historyLength = dealData.history?.length || 0
        const latestEvent = historyLength > 0 ? dealData.history![historyLength - 1] : null
        const action = latestEvent?.action || 'unknown'
        const actor = latestEvent?.actor || 'system'

        const payloadChanges: Record<string, unknown> = {}

        if (eventName === 'deal.status_changed') {
          payloadChanges.status = { to: dealData.status, from: 'unknown' }
        }

        if (eventName.startsWith('deal.offer.') && dealData.offers?.length) {
          payloadChanges.offer = dealData.offers[dealData.offers.length - 1]
        }

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

        const promises = relevantWebhooks.map(webhook => deliverToWebhook(webhook, payloadObj, 1))
        await Promise.allSettled(promises)
      }

      const eventsQueue = [event, ...(additionalEvents || [])]
      for (const e of eventsQueue) {
        await processEvent(e)
      }

    } catch (err) {
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
  const signature = 'sha256=' + crypto.createHmac('sha256', webhook.secret).update(payloadString).digest('hex')
  const timestamp = Math.floor(Date.now() / 1000).toString()

  const startTime = Date.now()
  let isSuccess = false
  let response_status: number | undefined
  let response_body: string | undefined
  let error_message: string | undefined

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
    response_status = response.status
    const text = await response.text().catch(() => '')
    response_body = text.substring(0, 1000)
    isSuccess = response.ok

  } catch (err: any) {
    isSuccess = false
    error_message = err.name === 'AbortError' ? 'Request Timeout (10s)' : (err.message || 'Network error')
  }

  const duration_ms = Date.now() - startTime
  const delivered_at = new Date().toISOString()

  // Save to Supabase
  await supabaseAdmin.from('webhook_deliveries').insert({
    id: crypto.randomUUID(),
    webhook_id: webhook.id,
    deal_id: (payload.data as any)?.deal?.id,
    event: payload.event as string,
    payload: payload,
    attempt_number: attemptNumber,
    response_status,
    response_body,
    duration_ms,
    succeeded: isSuccess,
    error_message,
    delivered_at
  })

  if (attemptNumber === 1) {
    await supabaseAdmin.from('webhooks').update({ last_triggered_at: delivered_at }).eq('id', webhook.id)
  }

  if (!isSuccess && attemptNumber < 5) {
    const retryDelays = [30 * 1000, 5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000]
    const waitMs = retryDelays[attemptNumber - 1]
    const nextAttemptTime = new Date(Date.now() + waitMs).toISOString()

    await supabaseAdmin.from('webhook_retry_queue').insert({
      webhook_id: webhook.id,
      deal_id: (payload.data as any)?.deal?.id,
      payload: payload,
      event: payload.event as string,
      next_attempt_number: attemptNumber + 1,
      retry_after: nextAttemptTime
    })
  }

  return isSuccess
}

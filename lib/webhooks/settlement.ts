import crypto from 'node:crypto'
import type { DealData, DealEvent } from '../../types/index'
import { createClient } from '@supabase/supabase-js'

export async function dispatchSettlementProtocol(deal: DealData, event: DealEvent) {
    const webhookSecret = process.env.WEBHOOK_SECRET
    if (!webhookSecret) {
        console.warn('Cannot dispatch settlement protocol: WEBHOOK_SECRET is not configured.')
        return
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch the developer's registered settlement webhooks (or default webhooks)
    const { data: webhooks } = await supabaseAdmin
        .from('webhooks')
        .select('*')
        .eq('developer_id', deal.developer_id)
        .eq('is_active', true)

    const settlementWebhooks = webhooks?.filter(w => w.events.includes('deal.settlement') || w.events.includes('*')) ?? []

    if (settlementWebhooks.length === 0) return

    const payload = {
        event: 'deal.settlement',
        deal_id: deal.id,
        outcome: deal.outcome,
        final_value: deal.final_value,
        final_currency: deal.final_currency,
        closed_at: deal.closed_at,
        signature_proof: event.signature_proof // Crucial for Non-Repudiation Loop!
    }

    const payloadString = JSON.stringify(payload)

    // Create HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', webhookSecret)
    hmac.update(payloadString)
    const signature = hmac.digest('hex')

    // Dispatch to all listening endpoints
    for (const hook of settlementWebhooks) {
        try {
            await fetch(hook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-dealflow-signature': signature // The verifiable signature to prevent spoofing
                },
                body: payloadString
            })
        } catch (e) {
            console.error(`Failed to dispatch settlement to ${hook.url}`, e)
        }
    }
}

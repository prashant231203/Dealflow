import { deliverToWebhook } from '../webhooks/delivery'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function retryWebhooksJob(): Promise<number> {
    const now = new Date().toISOString()
    let processedCount = 0

    // 1. Find all items ready for retry in Supabase
    const { data: toRetry, error: queueError } = await supabaseAdmin
        .from('webhook_retry_queue')
        .select(`
            *,
            webhook:webhooks (*)
        `)
        .lte('retry_after', now)

    if (queueError || !toRetry) return 0

    for (const item of toRetry) {
        // 2. Remove the entry before processing to avoid infinite loops if the process crashes
        const { error: deleteError } = await supabaseAdmin
            .from('webhook_retry_queue')
            .delete()
            .eq('id', item.id)

        if (deleteError) continue

        // 3. Check if webhook exists and is still active
        const webhook = item.webhook
        if (!webhook || !webhook.is_active) {
            continue
        }

        // 4. Attempt redelivery
        await deliverToWebhook(webhook, item.payload as any, item.next_attempt_number)
        processedCount++
    }

    return processedCount
}

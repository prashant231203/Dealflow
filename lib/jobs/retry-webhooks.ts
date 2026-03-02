import { memoryStore } from '../store/in-memory.js'
import { deliverToWebhook } from '../webhooks/delivery.js'

export async function retryWebhooksJob(): Promise<number> {
    const now = new Date()
    let processedCount = 0

    // We filter out items we want to process
    // We need to mutate the array safely, so we iterate over a copy of the matching indices
    const queue = memoryStore.webhook_retry_queue

    // Find all items ready for retry
    const toRetry = queue.filter((item: any) => new Date(item.retry_after) <= now)

    for (const item of toRetry) {
        const webhook = memoryStore.webhooks.find((w: any) => w.id === item.webhook_id)

        // Remove the item right away - if it fails again and has retries left, 
        // deliverToWebhook will insert a fresh retry row with the updated parameters
        const originIndex = queue.findIndex((q: any) => q.id === item.id)
        if (originIndex !== -1) queue.splice(originIndex, 1)

        // Check if webhook is still active
        if (!webhook || !webhook.is_active) {
            continue // skip and it's already deleted from queue
        }

        // Attempt redelivery
        await deliverToWebhook(webhook, item.payload, item.next_attempt_number)
        processedCount++
    }

    return processedCount
}

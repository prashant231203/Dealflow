import { memoryStore } from '../store/in-memory.js'
import { generateDealSummary } from '../intelligence/summary.js'
import { appendEvent } from '../deals/events.js'
import { fireWebhooks } from '../webhooks/delivery.js'

export async function expireDealsJob(): Promise<number> {
    const now = new Date()
    let processedCount = 0

    for (const deal of memoryStore.deals) {
        if (!deal.expires_at) continue

        const expiresAt = new Date(deal.expires_at)
        if (expiresAt <= now && ['active', 'paused', 'escalated'].includes(deal.status!)) {

            deal.status = 'expired'
            deal.outcome = 'expired'
            deal.closed_at = now.toISOString()

            const payload = { reason: 'Deal deadline passed', expired_at: now.toISOString() }
            const event = appendEvent({
                deal_id: deal.id,
                action: 'system_expired',
                actor: 'system',
                payload,
                summary_before: deal.current_summary,
                summary_after: deal.current_summary, // placeholder, will update
                sequence_number: memoryStore.events.filter((e: any) => e.deal_id === deal.id).length + 1
            })

            memoryStore.events.push(event)

            // Regenerate summary
            const recentEvents = memoryStore.events
                .filter((item: any) => item.deal_id === deal.id)
                .sort((a: any, b: any) => b.sequence_number - a.sequence_number)
                .slice(0, 10).reverse()

            const pendingOffers = memoryStore.offers.filter((item: any) => item.deal_id === deal.id && item.status === 'pending')

            deal.current_summary = await generateDealSummary(deal, recentEvents, pendingOffers, 'system_expired', 'system')
            event.summary_after = deal.current_summary
            deal.history = memoryStore.events.filter((e: any) => e.deal_id === deal.id)

            fireWebhooks(deal.developer_id, deal.id, 'deal.expired', deal, ['deal.status_changed'])
            processedCount++
        }
    }

    return processedCount
}

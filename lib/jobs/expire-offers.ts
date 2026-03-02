import { memoryStore } from '../store/in-memory.js'
import { generateDealSummary } from '../intelligence/summary.js'
import { appendEvent } from '../deals/events.js'
import { computeBestOffer } from '../intelligence/offers.js'
import { fireWebhooks } from '../webhooks/delivery.js'

export async function expireOffersJob(): Promise<number> {
    const now = new Date()
    let processedCount = 0
    const updatedDealIds = new Set<string>()

    for (const offer of memoryStore.offers) {
        if (!offer.expires_at || offer.status !== 'pending') continue

        if (new Date(offer.expires_at) <= now) {
            offer.status = 'expired'

            const deal = memoryStore.deals.find((d: any) => d.id === offer.deal_id)
            if (deal) {
                const payload = { offer_id: offer.id, expired_at: now.toISOString() }
                const event = appendEvent({
                    deal_id: deal.id,
                    action: 'system_offer_expired',
                    actor: 'system',
                    payload,
                    summary_before: deal.current_summary,
                    summary_after: deal.current_summary, // placeholder
                    sequence_number: memoryStore.events.filter((e: any) => e.deal_id === deal.id).length + 1
                })
                memoryStore.events.push(event)

                deal.current_best_offer = computeBestOffer(deal.id, deal.constraints, deal.type)
                updatedDealIds.add(deal.id)

                deal.history = memoryStore.events.filter((e: any) => e.deal_id === deal.id)
                // Note: we don't necessarily fire a dedicated top-level event for offer expiration unless we want to map it
                // The spec didn't list deal.offer.expired natively, but we can do a generic 'status' changed or not fire.
            }
            processedCount++
        }
    }

    // Batch regenerate summaries for updated deals
    for (const dealId of Array.from(updatedDealIds)) {
        const deal = memoryStore.deals.find((d: any) => d.id === dealId)
        if (!deal) continue

        const recentEvents = memoryStore.events
            .filter((item: any) => item.deal_id === deal.id)
            .sort((a: any, b: any) => b.sequence_number - a.sequence_number)
            .slice(0, 10).reverse()

        const pendingOffers = memoryStore.offers.filter((item: any) => item.deal_id === deal.id && item.status === 'pending')

        deal.current_summary = await generateDealSummary(deal, recentEvents, pendingOffers, 'system_offer_expired', 'system')

        // Update the last event's summary_after
        const lastEvent = memoryStore.events.filter((e: any) => e.deal_id === deal.id).pop()
        if (lastEvent) lastEvent.summary_after = deal.current_summary
    }

    return processedCount
}

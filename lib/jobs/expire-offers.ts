import { generateDealSummary } from '../intelligence/summary'
import { computeBestOffer } from '../intelligence/offers'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function expireOffersJob(): Promise<number> {
    const now = new Date().toISOString()
    let processedCount = 0

    // 1. Find all expired pending offers
    const { data: expiredOffers, error: offerError } = await supabaseAdmin
        .from('deal_offers')
        .select('*')
        .eq('status', 'pending')
        .lte('expires_at', now)

    if (offerError || !expiredOffers || expiredOffers.length === 0) return 0

    const dealIds = Array.from(new Set(expiredOffers.map(o => o.deal_id)))

    for (const dealId of dealIds) {
        // Fetch fresh deal data
        const { data: deal, error: dealError } = await supabaseAdmin
            .from('deals')
            .select('*')
            .eq('id', dealId)
            .single()

        if (dealError || !deal) continue

        const dealOffers = expiredOffers.filter(o => o.deal_id === dealId)

        for (const offer of dealOffers) {
            // Update offer status
            await supabaseAdmin
                .from('deal_offers')
                .update({ status: 'expired' })
                .eq('id', offer.id)

            // Add history event
            const { count: historyCount } = await supabaseAdmin
                .from('deal_events')
                .select('*', { count: 'exact', head: true })
                .eq('deal_id', dealId)

            await supabaseAdmin.from('deal_events').insert({
                deal_id: deal.id,
                action: 'system_offer_expired',
                actor: 'system',
                payload: { offer_id: offer.id, expired_at: now },
                summary_before: deal.current_summary,
                summary_after: deal.current_summary, // placeholder for now
                sequence_number: (historyCount ?? 0) + 1
            })
            processedCount++
        }

        // Recompute Deal State
        const { data: allOffers } = await supabaseAdmin
            .from('deal_offers')
            .select('*')
            .eq('deal_id', dealId)

        const { data: recentEvents } = await supabaseAdmin
            .from('deal_events')
            .select('*')
            .eq('deal_id', dealId)
            .order('sequence_number', { ascending: false })
            .limit(10)

        const bestOffer = computeBestOffer(dealId, deal.constraints, deal.type, allOffers ?? [])
        const pendingOffers = (allOffers ?? []).filter(o => o.status === 'pending')
        const summary = await generateDealSummary(deal, (recentEvents ?? []).reverse(), pendingOffers, 'system_offer_expired', 'system')

        // Update Deal
        await supabaseAdmin.from('deals').update({
            current_best_offer: bestOffer,
            current_summary: summary,
            updated_at: now
        }).eq('id', dealId)

        // Update the last event summary_after
        const { data: lastEvents } = await supabaseAdmin
            .from('deal_events')
            .select('id')
            .eq('deal_id', dealId)
            .order('sequence_number', { ascending: false })
            .limit(1)

        if (lastEvents && lastEvents.length > 0) {
            await supabaseAdmin.from('deal_events').update({ summary_after: summary }).eq('id', lastEvents[0].id)
        }
    }

    return processedCount
}

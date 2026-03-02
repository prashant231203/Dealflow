import { generateDealSummary } from '../intelligence/summary'
import { fireWebhooks } from '../webhooks/delivery'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function expireDealsJob(): Promise<number> {
    const now = new Date().toISOString()
    let processedCount = 0

    // 1. Find all expired deals
    const { data: expiredDeals, error: dealError } = await supabaseAdmin
        .from('deals')
        .select('*')
        .in('status', ['active', 'paused', 'escalated'])
        .lte('expires_at', now)

    if (dealError || !expiredDeals || expiredDeals.length === 0) return 0

    for (const deal of expiredDeals) {
        // 2. Fetch dependencies
        const [
            { data: offers },
            { count: historyCount }
        ] = await Promise.all([
            supabaseAdmin.from('deal_offers').select('*').eq('deal_id', deal.id),
            supabaseAdmin.from('deal_events').select('*', { count: 'exact', head: true }).eq('deal_id', deal.id)
        ])

        const pendingOffers = (offers ?? []).filter(o => o.status === 'pending')

        // 3. Update Deal Status
        await supabaseAdmin.from('deals').update({
            status: 'expired',
            outcome: 'expired',
            closed_at: now,
            updated_at: now
        }).eq('id', deal.id)

        // 4. Add Event
        const { data: recentEvents } = await supabaseAdmin
            .from('deal_events')
            .select('*')
            .eq('deal_id', deal.id)
            .order('sequence_number', { ascending: false })
            .limit(10)

        const summary = await generateDealSummary(deal, (recentEvents ?? []).reverse(), pendingOffers, 'system_expired', 'system')

        await supabaseAdmin.from('deal_events').insert({
            deal_id: deal.id,
            action: 'system_expired',
            actor: 'system',
            payload: { reason: 'Deal deadline passed', expired_at: now },
            summary_before: deal.current_summary,
            summary_after: summary,
            sequence_number: (historyCount ?? 0) + 1
        })

        // Update deal summary again with the new summary
        await supabaseAdmin.from('deals').update({ current_summary: summary }).eq('id', deal.id)

        // 5. Fire Hooks
        fireWebhooks(deal.developer_id, deal.id, 'deal.expired', { ...deal, status: 'expired', current_summary: summary }, ['deal.status_changed'])

        processedCount++
    }

    return processedCount
}

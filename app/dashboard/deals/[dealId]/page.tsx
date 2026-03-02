import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { DealData, DealEvent, DealOffer } from '@/types'
import { DealDetailClient } from '@/components/deals/DealDetailClient'

export const dynamic = 'force-dynamic'

export default async function DealDetailPage({ params }: { params: Promise<{ dealId: string }> }) {
    const { dealId } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Fetch deal, events, and offers in parallel
    const [
        { data: deal },
        { data: events },
        { data: offers }
    ] = await Promise.all([
        supabase.from('deals').select('*').eq('id', dealId).eq('developer_id', user.id).single(),
        supabase.from('deal_events').select('*').eq('deal_id', dealId).order('sequence_number', { ascending: false }),
        supabase.from('deal_offers').select('*').eq('deal_id', dealId).order('created_at', { ascending: false })
    ])

    if (!deal) {
        notFound()
    }

    const typedDeal = deal as DealData
    const typedEvents = (events || []) as DealEvent[]
    const typedOffers = (offers || []) as DealOffer[]

    // Note: Reverse the chronological timeline descending order from Postgres to Ascending for correct chronological stack if necessary
    // Currently timeline logic renders strictly based on array order. It's ascending natively ? No, it's descending. Timeline event loop handles it.

    // We reverse events here to display oldest to newest top-down since timeline usually goes downwards,
    // Or we keep descending depending on the prior UI! The original `page.tsx` passed them raw:
    // `supabase.from('deal_events').order('sequence_number', { ascending: false })` 
    // Wait, let's keep it raw to minimize logic changes.

    return (
        <DealDetailClient
            initialDeal={typedDeal}
            initialEvents={typedEvents}
            initialOffers={typedOffers}
        />
    )
}

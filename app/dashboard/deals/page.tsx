import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { EmptyState } from '@/components/shared/EmptyState'
import { Inbox } from 'lucide-react'
import { DealsCanvasClient } from '@/components/deals/DealsCanvasClient'
import { DealCreateButton } from '@/components/deals/DealCreateButton'

export const dynamic = 'force-dynamic'

export default async function DealsListPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    await props.searchParams
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

    const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .eq('developer_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(200)

    const dealIds = (deals || []).map((d: any) => d.id)

    let offerCountMap = new Map<string, number>()
    let eventCountMap = new Map<string, number>()

    if (dealIds.length > 0) {
        const [{ data: offersRaw }, { data: eventsRaw }] = await Promise.all([
            supabase.from('deal_offers').select('deal_id').in('deal_id', dealIds),
            supabase.from('deal_events').select('deal_id').in('deal_id', dealIds),
        ])

        offerCountMap = (offersRaw || []).reduce((map: Map<string, number>, item: any) => {
            map.set(item.deal_id, (map.get(item.deal_id) || 0) + 1)
            return map
        }, new Map<string, number>())

        eventCountMap = (eventsRaw || []).reduce((map: Map<string, number>, item: any) => {
            map.set(item.deal_id, (map.get(item.deal_id) || 0) + 1)
            return map
        }, new Map<string, number>())
    }

    const dealsWithCounts = (deals || []).map((deal: any) => ({
        ...deal,
        offerCount: offerCountMap.get(deal.id) || 0,
        eventCount: eventCountMap.get(deal.id) || 0,
    }))

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-display text-2xl text-text-primary mb-1">Deal Canvas</h1>
                    <p className="text-text-secondary text-sm">Scan negotiations by health, budget progression, and momentum.</p>
                </div>
                <DealCreateButton />
            </div>

            {!deals || deals.length === 0 ? (
                <div className="bg-surface border border-border-default rounded-xl">
                    <EmptyState
                        icon={Inbox}
                        title="No deals found"
                        description="No deals have been created yet. Press ⌘K and run Create New Deal."
                    />
                </div>
            ) : (
                <DealsCanvasClient initialDeals={dealsWithCounts} developerId={user.id} />
            )}
        </div>
    )
}

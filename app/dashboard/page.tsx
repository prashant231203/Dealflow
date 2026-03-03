import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { DealFeed } from '@/components/dashboard/DealFeed'
import { OnboardingState } from '@/components/dashboard/OnboardingState'
import { RelativeTime } from '@/components/shared/RelativeTime'
import Link from 'next/link'

export default async function DashboardHome() {
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
    if (!user) return null // Handled by middleware but TS safety

    // Fetch parallel stats 
    const developerId = user.id

    const now = Date.now()
    const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString()
    const sixtyDaysAgo = new Date(now - 60 * 86400000).toISOString()
    const twentyFourHoursAgo = new Date(now - 86400000).toISOString()
    const fortyEightHoursAgo = new Date(now - 2 * 86400000).toISOString()

    const [
        { count: totalDeals },
        { count: activeCount },
        { count: closedTodayCount },
        { count: closedYesterdayCount },
        { data: allClosedData },
        { data: previousClosedData },
        { data: needsAttentionData },
        { data: recentEventsRaw }
    ] = await Promise.all([
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('developer_id', developerId),
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('developer_id', developerId).in('status', ['active', 'escalated']),
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('developer_id', developerId).in('outcome', ['completed']).gte('closed_at', twentyFourHoursAgo),
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('developer_id', developerId).in('outcome', ['completed']).gte('closed_at', fortyEightHoursAgo).lt('closed_at', twentyFourHoursAgo),
        supabase.from('deals').select('outcome, final_value').eq('developer_id', developerId).in('status', ['closed', 'expired', 'cancelled']).gte('closed_at', thirtyDaysAgo),
        supabase.from('deals').select('outcome, final_value').eq('developer_id', developerId).in('status', ['closed', 'expired', 'cancelled']).gte('closed_at', sixtyDaysAgo).lt('closed_at', thirtyDaysAgo),
        supabase.from('deals').select('id, intent, status, compliance_flags, updated_at').eq('developer_id', developerId).order('updated_at', { ascending: false }).limit(30),
        supabase.from('deal_events').select('id, deal_id, actor, action, payload, created_at, deals!inner(intent, developer_id)').eq('deals.developer_id', developerId).order('created_at', { ascending: false }).limit(50)
    ])

    // Total overarching condition
    if (totalDeals === 0) {
        return <OnboardingState />
    }

    let completedCount = 0
    let totalClosed30d = allClosedData?.length || 0
    let totalValue30d = 0

    if (allClosedData) {
        for (const d of allClosedData) {
            if (d.outcome === 'completed') completedCount++
            if (d.final_value && !isNaN(d.final_value)) totalValue30d += Number(d.final_value)
        }
    }

    let prevCompletedCount = 0
    let prevTotalClosed = previousClosedData?.length || 0
    let prevTotalValue = 0

    if (previousClosedData) {
        for (const d of previousClosedData) {
            if (d.outcome === 'completed') prevCompletedCount++
            if (d.final_value && !isNaN(d.final_value)) prevTotalValue += Number(d.final_value)
        }
    }

    const completionRate = totalClosed30d > 0 ? Math.round((completedCount / totalClosed30d) * 100) : 0
    const prevCompletionRate = prevTotalClosed > 0 ? Math.round((prevCompletedCount / prevTotalClosed) * 100) : 0

    function calculateTrend(current: number, previous: number, suffix: string): string | null {
        if (previous === 0 && current === 0) return null
        if (previous === 0) return null
        const change = ((current - previous) / previous) * 100
        const sign = change >= 0 ? '+' : ''
        return `${sign}${change.toFixed(0)}% from ${suffix}`
    }

    const closedTodayTrend = calculateTrend(closedTodayCount || 0, closedYesterdayCount || 0, 'yesterday')
    const completionTrend = calculateTrend(completionRate, prevCompletionRate, 'last month')
    const valueTrend = calculateTrend(totalValue30d, prevTotalValue, 'last month')

    const activityEvents = (recentEventsRaw || []).map((evt: any) => {
        const payload = evt.payload || {}
        const candidateValue = payload.price ?? payload.final_value
        const value = typeof candidateValue === 'number'
            ? candidateValue
            : typeof candidateValue === 'string' && !isNaN(Number(candidateValue))
                ? Number(candidateValue)
                : null

        return {
            id: evt.id,
            deal_id: evt.deal_id,
            actor: evt.actor || 'system',
            action: evt.action,
            created_at: evt.created_at,
            intent: evt.deals?.intent || 'Unknown deal',
            value,
            statusColor: 'default' as const,
        }
    })

    const needsAttention = (needsAttentionData || []).filter((deal: any) => {
        const hasCriticalFlags = Array.isArray(deal.compliance_flags)
            ? deal.compliance_flags.some((f: any) => f?.severity === 'critical')
            : false
        return deal.status === 'escalated' || hasCriticalFlags
    }).slice(0, 5)

    return (
        <div className="animate-fade-up max-w-[1400px] mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-[65%_35%] gap-5 items-start">
                <div>
                    <DealFeed initialEvents={activityEvents} developerId={developerId} initialActiveCount={activeCount || 0} />
                </div>

                <aside className="space-y-4">
                    <section className="rounded-xl border border-border-default bg-surface p-4">
                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="rounded-lg border border-border-dim bg-elevated p-3">
                                <div className="text-[11px] uppercase tracking-[0.1em] text-text-muted">Active Deals</div>
                                <div className="mt-2 font-mono text-2xl text-text-primary">{activeCount || 0}</div>
                            </div>
                            <div className="rounded-lg border border-border-dim bg-elevated p-3">
                                <div className="text-[11px] uppercase tracking-[0.1em] text-text-muted">Closed Today</div>
                                <div className="mt-2 font-mono text-2xl text-text-primary">{closedTodayCount || 0}</div>
                            </div>
                            <div className="rounded-lg border border-border-dim bg-elevated p-3">
                                <div className="text-[11px] uppercase tracking-[0.1em] text-text-muted">30D Rate</div>
                                <div className="mt-2 font-mono text-2xl text-text-primary">{completionRate}%</div>
                            </div>
                            <div className="rounded-lg border border-border-dim bg-elevated p-3">
                                <div className="text-[11px] uppercase tracking-[0.1em] text-text-muted">30D Value</div>
                                <div className="mt-2 font-mono text-2xl text-text-primary">${totalValue30d.toLocaleString()}</div>
                            </div>
                        </div>
                        {(closedTodayTrend || completionTrend || valueTrend) && (
                            <div className="mt-3 border-t border-border-dim pt-3 text-[11px] text-text-muted space-y-1">
                                {closedTodayTrend && <div>{closedTodayTrend}</div>}
                                {completionTrend && <div>{completionTrend}</div>}
                                {valueTrend && <div>{valueTrend}</div>}
                            </div>
                        )}
                    </section>

                    <section className="rounded-xl border border-border-default bg-surface p-4">
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">NEEDS ATTENTION</h3>
                        {needsAttention.length === 0 ? (
                            <div className="rounded-lg border border-positive/30 bg-positive-dim px-3 py-2 text-sm text-positive">✓ All deals on track</div>
                        ) : (
                            <div className="space-y-2">
                                {needsAttention.map((deal: any) => (
                                    <Link key={deal.id} href={`/dashboard/deals/${deal.id}`} className="block rounded-lg border border-border-dim bg-elevated px-3 py-2 hover:border-border-bright hover:bg-overlay">
                                        <div className="truncate text-sm text-text-primary">{deal.intent}</div>
                                        <div className="mt-1 flex items-center justify-between text-[11px] text-text-muted font-mono">
                                            <span className="uppercase">{deal.status}</span>
                                            <RelativeTime timestamp={deal.updated_at} />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="rounded-xl border border-border-default bg-surface p-4">
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Quick Actions</h3>
                        <div className="flex flex-wrap gap-2">
                            <Link href="/dashboard/deals?create=1" className="rounded-full border border-electric bg-electric-dim px-3 py-1.5 text-xs font-medium text-electric hover:bg-electric hover:text-black">+ New Deal</Link>
                            <Link href="/dashboard/keys" className="rounded-full border border-border-dim px-3 py-1.5 text-xs text-text-secondary hover:border-border-bright hover:text-text-primary">API Keys</Link>
                            <Link href="/dashboard/webhooks" className="rounded-full border border-border-dim px-3 py-1.5 text-xs text-text-secondary hover:border-border-bright hover:text-text-primary">Webhooks</Link>
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    )
}

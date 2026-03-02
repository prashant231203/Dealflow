import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { StatCard } from '@/components/dashboard/StatCard'
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
        { data: activeDealsRaw },
        { count: activeCount },
        { count: closedTodayCount },
        { count: closedYesterdayCount },
        { data: recentClosedData },
        { data: allClosedData }, // 30 day completion & value
        { data: previousClosedData } // 31-60 day completion & value
    ] = await Promise.all([
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('developer_id', developerId),
        supabase.from('deals').select('*').eq('developer_id', developerId).in('status', ['active', 'escalated']).order('updated_at', { ascending: false }).limit(20),
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('developer_id', developerId).in('status', ['active', 'escalated']),
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('developer_id', developerId).in('outcome', ['completed']).gte('closed_at', twentyFourHoursAgo),
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('developer_id', developerId).in('outcome', ['completed']).gte('closed_at', fortyEightHoursAgo).lt('closed_at', twentyFourHoursAgo),
        supabase.from('deals').select('id, intent, outcome, final_value, closed_at').eq('developer_id', developerId).in('status', ['closed', 'expired', 'cancelled']).order('closed_at', { ascending: false, nullsFirst: false }).limit(5),
        supabase.from('deals').select('outcome, final_value').eq('developer_id', developerId).in('status', ['closed', 'expired', 'cancelled']).gte('closed_at', thirtyDaysAgo),
        supabase.from('deals').select('outcome, final_value').eq('developer_id', developerId).in('status', ['closed', 'expired', 'cancelled']).gte('closed_at', sixtyDaysAgo).lt('closed_at', thirtyDaysAgo)
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

    return (
        <div className="animate-fade-up max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="font-display text-2xl text-text-primary mb-1">Overview</h1>
                <p className="text-text-secondary text-sm">Monitor your agent's active deals and recent performance.</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Active Deals"
                    value={activeCount || 0}
                    iconName="Activity"
                    colorKey="active"
                />
                <StatCard
                    label="Closed Today"
                    value={closedTodayCount || 0}
                    trend={closedTodayTrend}
                    iconName="Layers"
                    colorKey="closed"
                />
                <StatCard
                    label="Completion Rate"
                    value={completionRate}
                    trend={completionTrend}
                    iconName="Target"
                    colorKey="info"
                />
                <StatCard
                    label="Deal Value (30d)"
                    value={totalValue30d}
                    trend={valueTrend}
                    isCurrency
                    iconName="Coins"
                    colorKey="warning"
                />
            </div>

            {/* Main Content Area */}
            <div className="grid lg:grid-cols-3 gap-8 items-start">

                {/* Deal Feed (Left 2/3) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-display text-lg">Live Active Deals</h2>
                        <Link href="/dashboard/deals" className="text-sm text-electric hover:underline underline-offset-4">
                            View all deals →
                        </Link>
                    </div>
                    <DealFeed initialDeals={activeDealsRaw || []} developerId={developerId} />
                </div>

                {/* Recent Closures (Right 1/3) */}
                <div className="space-y-4">
                    <h2 className="font-display text-lg">Recent Closures</h2>
                    <div className="bg-surface border border-border-default rounded-xl overflow-hidden p-1">
                        {recentClosedData && recentClosedData.length > 0 ? (
                            recentClosedData.map((deal) => (
                                <div key={deal.id} className="p-4 hover:bg-elevated transition-colors border-b border-border-dim last:border-0 rounded-lg group">
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="font-medium text-sm text-text-primary capitalize truncate pr-4">
                                            {deal.intent}
                                        </span>
                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${deal.outcome === 'completed' ? 'bg-positive/10 text-positive border border-positive/20' :
                                            deal.outcome === 'cancelled' || deal.outcome === 'failed' ? 'bg-danger/10 text-danger border border-danger/20' :
                                                'bg-overlay text-text-secondary border border-border-dim'
                                            }`}>
                                            {deal.outcome || 'Closed'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-3 text-xs">
                                        <span className="text-text-muted">
                                            <RelativeTime timestamp={deal.closed_at || new Date().toISOString()} />
                                        </span>
                                        {deal.final_value && (
                                            <span className="font-mono text-positive font-medium">
                                                +${deal.final_value.toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-sm text-text-secondary">
                                No closed deals recently.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}

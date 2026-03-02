'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, BarChart, Bar, Cell } from 'recharts'
import { Activity, TrendingUp, BarChart3, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'

const ACTION_LABELS: Record<string, string> = {
    offer: 'Offer Made',
    counter: 'Counter Offer',
    accept: 'Offer Accepted',
    reject: 'Offer Rejected',
    withdraw: 'Offer Withdrawn',
    pause: 'Deal Paused',
    resume_process: 'Deal Resumed',
    escalate: 'Sent for Review',
    reassign: 'Reassigned',
    close: 'Deal Closed',
    cancel: 'Deal Cancelled',
    note: 'Note Added',
    system_expired: 'Auto Expired',
}

export default function AnalyticsPage() {
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
    const [isLoading, setIsLoading] = useState(true)

    // Top-Level Stats
    const [totalDeals, setTotalDeals] = useState<number>(0)
    const [totalValue, setTotalValue] = useState<number>(0)
    const [avgDuration, setAvgDuration] = useState<string>('—')
    const [topComplianceIssue, setTopComplianceIssue] = useState<string>('No issues recorded')

    // Chart Data
    const [completionData, setCompletionData] = useState<any[]>([])
    const [valueData, setValueData] = useState<any[]>([])
    const [actionData, setActionData] = useState<any[]>([])

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        async function fetchAnalytics() {
            setIsLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const developerId = user.id

            // 1. Fetch Deals
            const { data: dealsData } = await supabase
                .from('deals')
                .select('id, created_at, closed_at, outcome, final_value, compliance_flags, status')
                .eq('developer_id', developerId)

            const deals = dealsData || []
            setTotalDeals(deals.length)

            if (deals.length === 0) {
                setIsLoading(false)
                return
            }

            // A. Top-level Computations
            let valSum = 0
            deals.forEach(d => { if (d.outcome === 'completed') valSum += (d.final_value || 0) })
            setTotalValue(valSum)

            const closedDeals = deals.filter(d => d.closed_at)
            if (closedDeals.length > 0) {
                const totalHours = closedDeals.reduce((acc, d) => {
                    return acc + (new Date(d.closed_at).getTime() - new Date(d.created_at).getTime()) / (1000 * 3600)
                }, 0)
                const avgHr = totalHours / closedDeals.length
                setAvgDuration(avgHr > 48 ? `${(avgHr / 24).toFixed(1)} days` : `${avgHr.toFixed(1)} hours`)
            }

            const flagCounts: Record<string, number> = {}
            deals.forEach(d => {
                if (Array.isArray(d.compliance_flags)) {
                    d.compliance_flags.forEach(f => {
                        const type = f.type || 'Custom'
                        flagCounts[type] = (flagCounts[type] || 0) + 1
                    })
                }
            })
            const sortedFlags = Object.entries(flagCounts).sort((a, b) => b[1] - a[1])
            if (sortedFlags.length > 0) {
                const formattedName = sortedFlags[0][0].replace(/_/g, ' ')
                setTopComplianceIssue(`${formattedName} (${sortedFlags[0][1]})`)
            }

            // B. Line Chart: Completion Rate
            const daysCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
            const now = new Date()
            const dates = []
            for (let i = daysCount - 1; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
                dates.push(d.toISOString().split('T')[0])
            }

            const rateData = dates.map(dayStr => {
                const dayDeals = deals.filter(d => {
                    return d.closed_at && d.closed_at.startsWith(dayStr) && ['closed', 'cancelled', 'expired', 'completed'].includes(d.status || d.outcome || '')
                })
                const completedCount = dayDeals.filter(d => d.outcome === 'completed').length
                const rate = dayDeals.length > 0 ? (completedCount / dayDeals.length) * 100 : null
                return {
                    day: new Date(dayStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    rate,
                    completed: completedCount,
                    total: dayDeals.length
                }
            })
            setCompletionData(rateData)

            // C. Bar Chart: Deal Value (Last 8 Weeks)
            const weeks = []
            for (let i = 7; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
                const day = d.getDay()
                const diff = d.getDate() - day + (day === 0 ? -6 : 1)
                const weekStart = new Date(d.setDate(diff))
                weekStart.setHours(0, 0, 0, 0)
                weeks.push(weekStart)
            }
            const weeklyVal = weeks.map(ws => {
                const we = new Date(ws.getTime() + 7 * 24 * 60 * 60 * 1000)
                const weekDeals = deals.filter(d => d.outcome === 'completed' && d.closed_at && new Date(d.closed_at) >= ws && new Date(d.closed_at) < we)
                const sum = weekDeals.reduce((acc, d) => acc + (d.final_value || 0), 0)
                return {
                    week: ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    value: sum,
                    count: weekDeals.length
                }
            })
            setValueData(weeklyVal)

            // D. Action Breakdown
            const { data: eventsData } = await supabase
                .from('deal_events')
                .select('action, deals!inner(developer_id)')
                .eq('deals.developer_id', developerId)

            if (eventsData) {
                const actionCounts: Record<string, number> = {}
                eventsData.forEach(e => {
                    const lab = ACTION_LABELS[e.action] || e.action
                    actionCounts[lab] = (actionCounts[lab] || 0) + 1
                })
                const sortedActions = Object.entries(actionCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([name, count]) => ({ name, count }))
                setActionData(sortedActions)
            }

            setIsLoading(false)
        }

        fetchAnalytics()
    }, [timeRange, supabase])

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-elevated border border-border-bright p-3 rounded-lg shadow-2xl backdrop-blur-md">
                    <p className="text-text-secondary text-xs mb-2 font-medium">{label}</p>
                    {payload.map((p: any) => (
                        <div key={p.name} className="flex items-center justify-between gap-4 text-sm font-mono mb-1">
                            <span style={{ color: p.color }}>{p.name}:</span>
                            <span className="text-text-primary px-1 font-bold">
                                {p.name === 'Value' ? '$' : ''}{Number(p.value).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                {p.name === 'Rate' ? '%' : ''}
                            </span>
                        </div>
                    ))}
                </div>
            )
        }
        return null
    }

    if (!isLoading && totalDeals === 0) {
        return (
            <div className="max-w-7xl mx-auto animate-fade-up">
                <div className="bg-surface border border-border-default rounded-xl p-12 text-center flex flex-col items-center justify-center">
                    <BarChart3 className="w-12 h-12 text-text-muted mb-4 opacity-50" />
                    <h2 className="text-lg font-display text-text-primary mb-2">No Commerce Data Yet</h2>
                    <p className="text-text-secondary mb-6">Analytics will appear here once your agents start creating deals.</p>
                    <Link href="/dashboard" className="bg-electric text-bg-void px-4 py-2 rounded font-medium hover:bg-electric/90 transition-colors">
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto animate-fade-up space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="font-display text-2xl text-text-primary mb-1">Analytics</h1>
                    <p className="text-text-secondary text-sm">Review commerce volume, resolutions, and API automation health.</p>
                </div>

                <div className="bg-surface border border-border-dim rounded-md px-1 py-1 flex gap-1">
                    <button onClick={() => setTimeRange('90d')} className={`px-3 py-1 text-xs rounded transition-colors ${timeRange === '90d' ? 'bg-overlay text-electric font-medium' : 'text-text-secondary hover:text-text-primary'}`}>90D</button>
                    <button onClick={() => setTimeRange('30d')} className={`px-3 py-1 text-xs rounded transition-colors ${timeRange === '30d' ? 'bg-overlay text-electric font-medium' : 'text-text-secondary hover:text-text-primary'}`}>30D</button>
                    <button onClick={() => setTimeRange('7d')} className={`px-3 py-1 text-xs rounded transition-colors ${timeRange === '7d' ? 'bg-overlay text-electric font-medium' : 'text-text-secondary hover:text-text-primary'}`}>7D</button>
                </div>
            </div>

            {/* Top Stats Array */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface border border-border-dim rounded-lg p-5">
                    <div className="text-text-muted text-xs font-medium mb-1 flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" /> Total Deals</div>
                    <div className="text-2xl font-display text-text-primary">{isLoading ? '—' : totalDeals}</div>
                </div>
                <div className="bg-surface border border-border-dim rounded-lg p-5">
                    <div className="text-text-muted text-xs font-medium mb-1 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" /> Value Settled</div>
                    <div className="text-2xl font-display text-text-primary">{isLoading ? '—' : `$${totalValue.toLocaleString()}`}</div>
                </div>
                <div className="bg-surface border border-border-dim rounded-lg p-5">
                    <div className="text-text-muted text-xs font-medium mb-1 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Avg Duration</div>
                    <div className="text-2xl font-display text-text-primary">{isLoading ? '—' : avgDuration}</div>
                </div>
                <div className="bg-surface border border-border-dim rounded-lg p-5">
                    <div className="text-text-muted text-xs font-medium mb-1 flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" /> Top Compliance Issue</div>
                    <div className="text-sm font-medium text-text-primary capitalize pt-1">{isLoading ? '—' : topComplianceIssue}</div>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">

                {/* Completion Rate Line Chart */}
                <div className="bg-surface border border-border-default rounded-xl p-6 relative">
                    {isLoading && <div className="absolute inset-0 z-10 bg-bg-void/40 backdrop-blur-[2px] rounded-xl flex items-center justify-center"><div className="w-6 h-6 border-2 border-electric border-t-transparent flex items-center justify-center rounded-full animate-spin" /></div>}

                    <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2 mb-6">
                        <Activity className="w-4 h-4 text-text-muted" /> Completion Rate (Success vs Total Closed)
                    </h3>

                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={completionData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} />
                                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-bright)' }} />
                                <Line type="monotone" dataKey="rate" connectNulls name="Rate" stroke="var(--electric)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--electric)', stroke: 'var(--bg-void)' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Closed Value Bar Chart */}
                <div className="bg-surface border border-border-default rounded-xl p-6 relative">
                    {isLoading && <div className="absolute inset-0 z-10 bg-bg-void/40 backdrop-blur-[2px] rounded-xl flex items-center justify-center"><div className="w-6 h-6 border-2 border-electric border-t-transparent flex items-center justify-center rounded-full animate-spin" /></div>}

                    <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2 mb-6">
                        <TrendingUp className="w-4 h-4 text-text-muted" /> Settled Value (Last 8 Weeks)
                    </h3>

                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={valueData} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} />
                                <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--overlay)' }} />
                                <Bar dataKey="value" name="Value" fill="#FFB347" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* Action Breakdown */}
            <div className="bg-surface border border-border-default rounded-xl p-6 relative">
                {isLoading && <div className="absolute inset-0 z-10 bg-bg-void/40 backdrop-blur-[2px] rounded-xl flex items-center justify-center"><div className="w-6 h-6 border-2 border-electric border-t-transparent flex items-center justify-center rounded-full animate-spin" /></div>}

                <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2 mb-6">
                    <BarChart3 className="w-4 h-4 text-electric" /> Most Common Actions Initiated
                </h3>

                <div className="space-y-4 max-w-3xl">
                    {actionData.length > 0 ? actionData.map((act, i) => {
                        const totalActCount = actionData.reduce((acc, curr) => acc + curr.count, 0)
                        const pct = ((act.count / totalActCount) * 100).toFixed(1)
                        return (
                            <div key={act.name}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-mono text-text-primary">{act.name}</span>
                                    <span className="text-text-muted">{pct}% ({act.count})</span>
                                </div>
                                <div className="w-full bg-overlay rounded-full h-1.5">
                                    <div className="bg-electric h-1.5 rounded-full" style={{ width: `${pct}%`, opacity: 1 - (i * 0.15) }}></div>
                                </div>
                            </div>
                        )
                    }) : (
                        <div className="text-sm text-text-muted italic">No actions recorded yet.</div>
                    )}
                </div>
            </div>
        </div>
    )
}

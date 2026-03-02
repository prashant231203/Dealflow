'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { Activity, TrendingUp, BarChart3, AlertCircle } from 'lucide-react'

// Dummy data for visual presentation while we wait for real data
const generatedData = Array.from({ length: 30 }).map((_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        deals: Math.floor(Math.random() * 50) + 10,
        value: Math.floor(Math.random() * 5000) + 1000,
        errors: Math.floor(Math.random() * 5)
    }
})

export default function AnalyticsPage() {
    const [data, setData] = useState(generatedData)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // In a real implementation we would fetch aggregated analytics from our backend or Supabase rpc
        // For now we simulate loading and use the generated seed to fulfill the UX requirements
        const timer = setTimeout(() => setIsLoading(false), 800)
        return () => clearTimeout(timer)
    }, [])

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-elevated border border-border-bright p-3 rounded-lg shadow-2xl backdrop-blur-md">
                    <p className="text-text-secondary text-xs mb-2 font-medium">{label}</p>
                    {payload.map((p: any) => (
                        <div key={p.name} className="flex items-center justify-between gap-4 text-sm font-mono mb-1">
                            <span style={{ color: p.color }}>{p.name}:</span>
                            <span className="text-text-primary px-1 font-bold">
                                {p.name === 'Value' ? '$' : ''}{Number(p.value).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            )
        }
        return null
    }

    return (
        <div className="max-w-7xl mx-auto animate-fade-up space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="font-display text-2xl text-text-primary mb-1">Analytics</h1>
                    <p className="text-text-secondary text-sm">30-day trailing metrics for commerce volume and API health.</p>
                </div>

                <div className="bg-surface border border-border-dim rounded-md px-1 py-1 flex gap-1">
                    <button className="px-3 py-1 text-xs rounded bg-overlay text-text-primary font-medium">30D</button>
                    <button className="px-3 py-1 text-xs rounded text-text-secondary hover:text-text-primary transition-colors">7D</button>
                    <button className="px-3 py-1 text-xs rounded text-text-secondary hover:text-text-primary transition-colors">24H</button>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">

                {/* Deal Volume Chart */}
                <div className="bg-surface border border-border-default rounded-xl p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2 mb-1">
                                <Activity className="w-4 h-4 text-text-muted" /> Deal Volume
                            </h3>
                            <div className="text-3xl font-display text-text-primary">842</div>
                        </div>
                        <div className="text-xs font-medium text-positive bg-positive/10 border border-positive/20 px-2 py-1 rounded-md">
                            +12.5%
                        </div>
                    </div>

                    <div className="h-[280px] w-full relative">
                        {isLoading && (
                            <div className="absolute inset-0 z-10 bg-surface/50 backdrop-blur-sm flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-electric border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorDeals" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--electric)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--electric)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--text-muted)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={30}
                                />
                                <YAxis
                                    stroke="var(--text-muted)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-bright)' }} />
                                <Line
                                    type="monotone"
                                    dataKey="deals"
                                    name="Deals"
                                    stroke="var(--electric)"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, fill: 'var(--electric)', stroke: 'var(--bg-void)' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Closed Value Area Chart */}
                <div className="bg-surface border border-border-default rounded-xl p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2 mb-1">
                                <TrendingUp className="w-4 h-4 text-text-muted" /> Settled Value
                            </h3>
                            <div className="text-3xl font-display text-text-primary tabular-nums">$142,500</div>
                        </div>
                        <div className="text-xs font-medium text-positive bg-positive/10 border border-positive/20 px-2 py-1 rounded-md">
                            +8.1%
                        </div>
                    </div>

                    <div className="h-[280px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FFB347" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#FFB347" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--text-muted)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={30}
                                />
                                <YAxis
                                    stroke="var(--text-muted)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-bright)' }} />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    name="Value"
                                    stroke="#FFB347"
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="bg-surface border border-border-default rounded-xl p-6 col-span-1 border-t-2 border-t-danger">
                    <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2 mb-4">
                        <AlertCircle className="w-4 h-4 text-danger" /> API Errors (30d)
                    </h3>
                    <div className="text-4xl font-display text-text-primary mb-2">14</div>
                    <p className="text-xs text-text-muted">Down from 28 last month. Mostly 429 Too Many Requests limits.</p>
                </div>

                <div className="bg-surface border border-border-default rounded-xl p-6 col-span-2">
                    <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2 mb-4">
                        <BarChart3 className="w-4 h-4 text-electric" /> Top Handler Breakdowns
                    </h3>
                    {/* Mock breakdown bars */}
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-mono text-text-primary">agent_sales_primary</span>
                                <span className="text-text-muted">42%</span>
                            </div>
                            <div className="w-full bg-overlay rounded-full h-1.5">
                                <div className="bg-electric h-1.5 rounded-full" style={{ width: '42%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-mono text-text-primary">agent_customer_success</span>
                                <span className="text-text-muted">38%</span>
                            </div>
                            <div className="w-full bg-overlay rounded-full h-1.5">
                                <div className="bg-info h-1.5 rounded-full" style={{ width: '38%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-mono text-text-primary">agent_returns</span>
                                <span className="text-text-muted">20%</span>
                            </div>
                            <div className="w-full bg-overlay rounded-full h-1.5">
                                <div className="bg-warning h-1.5 rounded-full" style={{ width: '20%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

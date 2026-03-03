'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { DealData, DealEvent, DealOffer } from '@/types'
import { AiSummaryPanel } from '@/components/deals/AiSummaryPanel'
import { DealTimelineEvent } from '@/components/deals/DealTimelineEvent'
import { RelativeTime } from '@/components/shared/RelativeTime'
import { CopyButton } from '@/components/shared/CopyButton'
import { AlertTriangle, Tag, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface DealDetailClientProps {
    initialDeal: DealData
    initialEvents: DealEvent[]
    initialOffers: DealOffer[]
}

export function DealDetailClient({ initialDeal, initialEvents, initialOffers }: DealDetailClientProps) {
    const [deal, setDeal] = useState<DealData>(initialDeal)
    const [events, setEvents] = useState<DealEvent[]>(initialEvents)
    const [offers, setOffers] = useState<DealOffer[]>(initialOffers)
    const [summaryRefreshing, setSummaryRefreshing] = useState(false)
    const [latestEventId, setLatestEventId] = useState<string | null>(null)
    const timelineTopRef = useRef<HTMLDivElement>(null)
    const timelineEndRef = useRef<HTMLDivElement>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const channel = supabase
            .channel(`deal-detail-${deal.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'deals', filter: `id=eq.${deal.id}` },
                (payload) => {
                    setDeal(prev => ({ ...prev, ...payload.new } as DealData))
                    setSummaryRefreshing(true)
                    setTimeout(() => setSummaryRefreshing(false), 1200)
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'deal_events', filter: `deal_id=eq.${deal.id}` },
                (payload) => {
                    const newEvent = payload.new as DealEvent
                    setEvents(prev => [newEvent, ...prev])
                    setLatestEventId(newEvent.id)
                    setTimeout(() => setLatestEventId(null), 4000)
                    setTimeout(() => {
                        timelineTopRef.current?.scrollIntoView({ behavior: 'smooth' })
                    }, 50)
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'deal_offers', filter: `deal_id=eq.${deal.id}` },
                (payload) => {
                    const updatedOffer = payload.new as DealOffer
                    setOffers(prev => prev.map(o => o.id === updatedOffer.id ? updatedOffer : o))
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'deal_offers', filter: `deal_id=eq.${deal.id}` },
                (payload) => {
                    setOffers(prev => [payload.new as DealOffer, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [deal.id, supabase])

    const pendingOffers = offers.filter((o) => o.status === 'pending').length
    const flagsCount = deal.compliance_flags?.length || 0
    const detailMeta = `${deal.type} · Created ${new Date(deal.created_at).toLocaleDateString()} · ${deal.current_handler || 'buyer-agent'}`

    return (
        <div className="max-w-[1400px] mx-auto animate-fade-up space-y-4">
            <div className="flex items-center gap-2 text-sm text-text-muted">
                <Link href="/dashboard/deals" className="inline-flex items-center gap-1 hover:text-text-primary">
                    <ArrowLeft className="h-4 w-4" /> Deals
                </Link>
                <span>/</span>
                <span className="font-mono">{deal.id.slice(0, 14)}...</span>
                <CopyButton value={deal.id} size="sm" className="bg-transparent border-transparent" />
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h1 className="text-[24px] leading-8 text-text-primary">{deal.intent}</h1>
                    <div className="mt-2 text-[13px] text-text-muted">{detailMeta}</div>
                </div>

                {deal.tags && deal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {deal.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1.5 bg-surface border border-border-dim rounded-full px-3 py-1 text-xs font-medium text-text-secondary">
                                <Tag className="w-3 h-3" />
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[62%_38%] gap-6 items-start">
                <section className="min-w-0 rounded-xl border border-border-default bg-surface overflow-hidden">
                    <div className="px-5 py-4 border-b border-border-dim bg-overlay/30 flex items-center justify-between">
                        <h2 className="font-display font-medium text-text-primary flex items-center gap-2 uppercase tracking-[0.08em] text-sm">
                            HISTORY
                            <span className="text-xs bg-elevated px-2 rounded-full border border-border-dim text-text-muted font-mono">{events.length}</span>
                        </h2>
                        <button
                            onClick={() => timelineTopRef.current?.scrollIntoView({ behavior: 'smooth' })}
                            className="text-xs rounded-md border border-border-dim px-2 py-1 text-text-secondary hover:text-text-primary hover:border-border-bright"
                        >
                            ↓ latest
                        </button>
                    </div>
                    <div className="p-5">
                        <div ref={timelineTopRef} />
                        {events.length > 0 ? (
                            <div className="space-y-0 text-sm">
                                {events.map((event, index) => (
                                    <DealTimelineEvent
                                        key={event.id}
                                        event={event}
                                        isLast={index === events.length - 1}
                                        isLatest={latestEventId === event.id}
                                        style={{ animationDelay: `${index * 40}ms` }}
                                    />
                                ))}
                                <div ref={timelineEndRef} />
                            </div>
                        ) : (
                            <div className="text-center py-12 text-text-muted italic text-sm">
                                No events recorded yet.
                            </div>
                        )}
                    </div>
                </section>

                <aside className="w-full shrink-0 flex flex-col gap-4">
                    <AiSummaryPanel
                        summary={deal.current_summary}
                        isRefreshing={summaryRefreshing}
                        updatedAt={deal.updated_at}
                        pendingOffers={pendingOffers}
                        flagsCount={flagsCount}
                    />

                    <div className="bg-surface border border-border-default rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-border-dim text-sm uppercase tracking-[0.08em] text-text-secondary">Offers</div>
                        {offers.length > 0 ? (
                            <div className="divide-y divide-border-dim">
                                {offers.map((offer) => (
                                    <div key={offer.id} className="group px-4 py-3 hover:bg-elevated">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-xs text-text-secondary">{offer.made_by}</span>
                                            <span className="font-mono text-base text-text-primary">${Number(offer.price || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between text-[11px] text-text-muted">
                                            <span className={offer.within_budget ? 'text-positive' : 'text-warning'}>
                                                {offer.within_budget ? 'within budget' : 'outside budget'}
                                            </span>
                                            <span>{offer.expires_at ? <RelativeTime timestamp={offer.expires_at} /> : 'no expiry'}</span>
                                        </div>
                                        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="rounded-md border border-border-dim px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:border-border-bright">
                                                Accept
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-sm text-text-muted">No offers proposed yet.</div>
                        )}
                    </div>

                    <div className="bg-surface border border-border-default rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-border-dim text-sm uppercase tracking-[0.08em] text-text-secondary">Constraints</div>
                        {deal.constraints && Object.keys(deal.constraints).length > 0 ? (
                            <div className="p-4 space-y-2">
                                {Object.entries(deal.constraints).map(([key, value]) => (
                                    <div key={key} className="grid grid-cols-[140px_1fr] gap-3 text-sm">
                                        <div className="text-right text-[11px] uppercase tracking-[0.1em] text-text-muted">{key.replace(/_/g, ' ')}</div>
                                        <div className="font-mono text-text-primary break-all">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-sm text-text-muted">No constraints.</div>
                        )}
                    </div>

                    {deal.compliance_flags && deal.compliance_flags.length > 0 && (
                        <div className="bg-danger-dim border border-danger/30 p-5 rounded-xl animate-compliance-pulse">
                            <h3 className="font-display text-danger font-medium text-sm flex items-center gap-2 mb-4 uppercase tracking-[0.08em]">
                                <AlertTriangle className="w-4 h-4" /> Compliance Violations
                            </h3>
                            <div className="space-y-3">
                                {deal.compliance_flags.map((flag, i) => (
                                    <div key={i} className={`bg-bg-void/50 border border-danger/20 rounded p-3 text-sm ${flag.severity === 'critical' ? 'border-l-[3px] border-l-danger' : ''}`}>
                                        <div className="font-medium text-danger mb-1">{flag.type.replace(/_/g, ' ')}</div>
                                        <div className="text-text-primary">{flag.message}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    )
}

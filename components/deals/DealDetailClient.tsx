'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { DealData, DealEvent, DealOffer } from '@/types'
import { AiSummaryPanel } from '@/components/deals/AiSummaryPanel'
import { DealTimelineEvent } from '@/components/deals/DealTimelineEvent'
import { DealStatusDot } from '@/components/deals/DealStatusDot'
import { RelativeTime } from '@/components/shared/RelativeTime'
import { CopyButton } from '@/components/shared/CopyButton'
import { JsonViewer } from '@/components/shared/JsonViewer'
import { AlertTriangle, Tag, Clock } from 'lucide-react'

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
                    setEvents(prev => [...prev, newEvent])
                    setLatestEventId(newEvent.id)
                    setTimeout(() => setLatestEventId(null), 4000)
                    setTimeout(() => {
                        timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

    return (
        <div className="max-w-[1400px] mx-auto animate-fade-up h-[calc(100vh-80px)] flex flex-col">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 shrink-0">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="font-display text-2xl text-text-primary">{deal.intent}</h1>
                        <DealStatusDot status={deal.status} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-secondary font-mono">
                        <div className="flex items-center gap-1.5 focus-within:text-electric transition-colors">
                            <span>{deal.id}</span>
                            <CopyButton value={deal.id} size="sm" className="bg-transparent border-transparent" />
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <RelativeTime timestamp={deal.updated_at} />
                        </div>
                    </div>
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

            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-8">
                <div className="flex-1 flex flex-col min-w-0 bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-border-dim bg-overlay/30 shrink-0 sticky top-0 z-10 backdrop-blur-md">
                        <h2 className="font-display font-medium text-text-primary flex items-center gap-2">
                            Timeline History
                            <span className="text-xs bg-elevated px-2 rounded-full border border-border-dim text-text-muted font-mono">{events.length}</span>
                        </h2>
                    </div>
                    <div className="p-6 overflow-y-auto flex-1">
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
                </div>

                <div className="w-full lg:w-[480px] shrink-0 flex flex-col gap-6 overflow-y-auto pr-2 pb-8">
                    <div className={summaryRefreshing ? 'animate-shimmer' : ''}>
                        <AiSummaryPanel summary={deal.current_summary} />
                    </div>

                    {deal.compliance_flags && deal.compliance_flags.length > 0 && (
                        <div className="bg-danger-dim border border-danger/30 p-5 rounded-xl shadow-[0_0_20px_rgba(255,77,109,0.05)]">
                            <h3 className="font-display text-danger font-medium text-sm flex items-center gap-2 mb-4 uppercase tracking-wider">
                                <AlertTriangle className="w-4 h-4" /> Compliance Violations
                            </h3>
                            <div className="space-y-3">
                                {deal.compliance_flags.map((flag, i) => (
                                    <div key={i} className="bg-bg-void/50 border border-danger/20 rounded p-3 text-sm">
                                        <div className="font-medium text-danger mb-1">{flag.type.replace(/_/g, ' ')}</div>
                                        <div className="text-text-primary">{flag.message}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {deal.constraints && Object.keys(deal.constraints).length > 0 && (
                        <div className="bg-surface border border-border-default rounded-xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-border-dim bg-overlay/30">
                                <h3 className="font-display font-medium text-text-primary text-sm tracking-wide">
                                    Constraints & Parameters
                                </h3>
                            </div>
                            <div className="p-5">
                                <JsonViewer data={deal.constraints} initiallyOpen className="border-0 bg-transparent" />
                            </div>
                        </div>
                    )}

                    <div className="bg-surface border border-border-default rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-border-dim bg-overlay/30 flex justify-between items-center">
                            <h3 className="font-display font-medium text-text-primary text-sm tracking-wide">
                                Active Offers
                            </h3>
                            <span className="text-xs text-text-muted font-mono">{offers.length}</span>
                        </div>
                        <div className="p-0">
                            {offers.length > 0 ? (
                                <div className="divide-y divide-border-dim">
                                    {offers.map(offer => (
                                        <div key={offer.id} className="p-5 hover:bg-overlay transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-mono text-[10px] text-text-secondary">
                                                    Made by: <span className="text-electric">{offer.made_by}</span>
                                                </div>
                                                <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${offer.status === 'accepted' ? 'bg-positive/10 text-positive border-positive/30' :
                                                        offer.status === 'rejected' ? 'bg-danger/10 text-danger border-danger/30' :
                                                            offer.status === 'expired' ? 'bg-text-muted/10 text-text-muted border-text-muted/30' :
                                                                'bg-warning/10 text-warning border-warning/30'
                                                    }`}>
                                                    {offer.status}
                                                </div>
                                            </div>

                                            <div className="text-2xl font-display text-text-primary tabular-nums mb-3">
                                                {offer.currency === 'USD' ? '$' : ''}{offer.price.toLocaleString()}
                                                {offer.currency !== 'USD' && <span className="text-sm font-sans text-text-muted ml-1">{offer.currency}</span>}
                                            </div>

                                            {offer.notes && (
                                                <div className="text-sm text-text-secondary bg-elevated border border-border-dim p-3 rounded mb-3">
                                                    {offer.notes}
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center text-[10px] text-text-muted font-mono mt-2">
                                                <span><RelativeTime timestamp={offer.created_at} /></span>
                                                {offer.within_budget !== null && (
                                                    <span className={offer.within_budget ? 'text-positive flex items-center gap-1' : 'text-danger flex items-center gap-1'}>
                                                        {offer.within_budget ? '✓ Within Budget' : '✕ Over Budget'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 text-center text-sm text-text-muted italic">
                                    No offers proposed yet.
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

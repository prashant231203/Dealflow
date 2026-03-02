'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { DealData } from '@/types'
import { RelativeTime } from '../shared/RelativeTime'
import { DealStatusDot } from '../deals/DealStatusDot'
import { CopyButton } from '../shared/CopyButton'
import { EmptyState } from '../shared/EmptyState'
import { Inbox } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DealFeedProps {
    initialDeals: DealData[]
    developerId: string
    initialActiveCount?: number
}

export function DealFeed({ initialDeals, developerId, initialActiveCount = 0 }: DealFeedProps) {
    const [deals, setDeals] = useState<DealData[]>(initialDeals)
    const [highlightedId, setHighlightedId] = useState<string | null>(null)
    const [newDealId, setNewDealId] = useState<string | null>(null)
    const [fadingOutId, setFadingOutId] = useState<string | null>(null)
    const [realtimeConnected, setRealtimeConnected] = useState(false)
    const [activeCount, setActiveCount] = useState(initialActiveCount)

    const router = useRouter()

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const channel = supabase
            .channel('deals-feed-' + developerId)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'deals',
                    filter: `developer_id=eq.${developerId}`
                },
                (payload) => {
                    const newDeal = payload.new as DealData
                    if (['active', 'escalated', 'paused'].includes(newDeal.status)) {
                        setDeals(prev => {
                            if (prev.some(d => d.id === newDeal.id)) return prev
                            return [newDeal, ...prev]
                        })
                        setNewDealId(newDeal.id)
                        setActiveCount(prev => prev + 1)
                        setTimeout(() => setNewDealId(null), 3000)
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'deals',
                    filter: `developer_id=eq.${developerId}`
                },
                (payload) => {
                    const updatedDeal = payload.new as DealData
                    setDeals(prev => {
                        const exists = prev.find(d => d.id === updatedDeal.id)

                        if (!['active', 'escalated', 'paused'].includes(updatedDeal.status)) {
                            // Deal became inactive — remove from feed with delay
                            if (exists) {
                                setFadingOutId(updatedDeal.id)
                                setTimeout(() => {
                                    setDeals(p => p.filter(d => d.id !== updatedDeal.id))
                                    setFadingOutId(null)
                                }, 500)
                            }
                            return prev
                        }

                        // Deal updated — highlight and update row
                        if (exists) {
                            setHighlightedId(updatedDeal.id)
                            setTimeout(() => setHighlightedId(null), 600)
                            return prev.map(d => d.id === updatedDeal.id ? updatedDeal : d)
                        }

                        // Was inactive but is now active — add to feed
                        setNewDealId(updatedDeal.id)
                        setTimeout(() => setNewDealId(null), 3000)
                        return [updatedDeal, ...prev].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    })
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'deals',
                    filter: `developer_id=eq.${developerId}`
                },
                (payload) => {
                    setDeals(prev => prev.filter(d => d.id !== payload.old.id))
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setRealtimeConnected(true)
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setRealtimeConnected(false)
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [developerId, supabase])

    const reconnect = () => {
        router.refresh()
    }

    if (deals.length === 0) {
        return (
            <div className="bg-surface border border-border-default rounded-xl">
                <EmptyState
                    icon={Inbox}
                    title="No active deals"
                    description="Your agent's active and escalated deals will stream here contextually in real time."
                />
            </div>
        )
    }

    return (
        <div className="bg-surface border border-border-default rounded-xl overflow-hidden relative" aria-live="polite">
            {!realtimeConnected && (
                <button
                    onClick={reconnect}
                    className="absolute top-3 right-4 z-10 flex items-center gap-2 text-xs font-medium text-warning bg-warning-dim px-2 py-1 rounded-md border border-warning/30 hover:bg-warning/20 transition-colors"
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                    Live updates paused — click to reconnect
                </button>
            )}

            <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                    <div className="flex items-center h-10 px-4 border-b border-border-dim text-xs font-medium text-text-muted uppercase tracking-wider">
                        <div className="w-[120px] shrink-0">Deal ID</div>
                        <div className="flex-1 min-w-[200px]">Intent</div>
                        <div className="w-[120px] shrink-0">Status</div>
                        <div className="w-[140px] shrink-0">Handler</div>
                        <div className="w-[100px] shrink-0">Time Open</div>
                        <div className="w-[160px] shrink-0">Last Updated</div>
                    </div>

                    <div className="divide-y divide-border-dim">
                        {deals.map(deal => (
                            <div
                                key={deal.id}
                                onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
                                className={`flex items-center h-[60px] px-4 cursor-pointer transition-all duration-150 group relative
                                    ${highlightedId === deal.id ? 'animate-pulse-highlight' : 'hover:bg-overlay'}
                                    ${fadingOutId === deal.id ? 'animate-fade-out pointer-events-none' : ''}
                                `}
                            >
                                {/* ID */}
                                <div className="w-[120px] shrink-0 flex items-center gap-2 pr-4 relative z-10">
                                    <span className="font-mono text-xs text-text-muted">
                                        {deal.id.slice(0, 10)}...
                                    </span>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                        <CopyButton value={deal.id} size="sm" className="bg-transparent border-transparent" />
                                    </div>
                                </div>

                                {/* Intent & New Badge */}
                                <div className="flex-1 min-w-[200px] pr-4 flex items-center">
                                    <span className="text-sm text-text-primary truncate max-w-[90%]" title={deal.intent}>
                                        {deal.intent}
                                    </span>
                                    {newDealId === deal.id && (
                                        <span className="ml-3 inline-flex text-[10px] font-bold tracking-wider uppercase bg-electric/20 text-electric px-1.5 py-0.5 rounded animate-fade-up">
                                            NEW
                                        </span>
                                    )}
                                </div>

                                {/* Status */}
                                <div className="w-[120px] shrink-0 pr-4">
                                    <DealStatusDot status={deal.status} />
                                </div>

                                {/* Handler */}
                                <div className="w-[140px] shrink-0 pr-4">
                                    {deal.current_handler ? (
                                        <span className="inline-flex items-center justify-center px-2 py-0.5 bg-overlay/50 border border-border-dim rounded-full text-xs text-text-secondary truncate max-w-full">
                                            {deal.current_handler}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-text-muted italic">Unassigned</span>
                                    )}
                                </div>

                                {/* Time Open */}
                                <div className="w-[100px] shrink-0 text-text-secondary text-xs pr-4">
                                    <RelativeTime timestamp={deal.created_at} />
                                </div>

                                {/* Last Update */}
                                <div className="w-[160px] shrink-0 text-text-muted text-xs truncate">
                                    <RelativeTime timestamp={deal.updated_at} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

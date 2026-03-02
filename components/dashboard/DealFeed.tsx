'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { DealData } from '@/types'
import { RelativeTime } from '../shared/RelativeTime'
import { DealStatusDot } from '../deals/DealStatusDot'
import { CopyButton } from '../shared/CopyButton'
import { EmptyState } from '../shared/EmptyState'
import { Inbox } from 'lucide-react'

interface DealFeedProps {
    initialDeals: DealData[]
    developerId: string
}

export function DealFeed({ initialDeals, developerId }: DealFeedProps) {
    const [deals, setDeals] = useState<DealData[]>(initialDeals)
    const [isSubscribed, setIsSubscribed] = useState(true)
    const router = useRouter()

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        let mounted = true

        // Subscribe to realtime changes on the deals table for this developer
        const channel = supabase
            .channel('realtime_deals')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'deals',
                    filter: `developer_id=eq.${developerId}`
                },
                (payload) => {
                    if (!mounted) return

                    if (payload.eventType === 'INSERT') {
                        const newDeal = payload.new as DealData
                        // Only add if active/escalated to feed
                        if (['active', 'escalated'].includes(newDeal.status)) {
                            setDeals(prev => {
                                // Avoid duplicates
                                if (prev.some(d => d.id === newDeal.id)) return prev
                                return [{ ...newDeal, _isNew: true } as any, ...prev]
                            })

                            // Remove the _isNew flag after 3 seconds
                            setTimeout(() => {
                                setDeals(current =>
                                    current.map(d => d.id === newDeal.id ? { ...d, _isNew: false } : d)
                                )
                            }, 3000)
                        }
                    }
                    else if (payload.eventType === 'UPDATE') {
                        const updatedDeal = payload.new as DealData
                        setDeals(prev => {
                            const exists = prev.some(d => d.id === updatedDeal.id)

                            // If it exists but is now closed/cancelled/expired, remove it
                            if (exists && !['active', 'escalated'].includes(updatedDeal.status)) {
                                return prev.filter(d => d.id !== updatedDeal.id)
                            }

                            // If it exists and remains active, update it
                            if (exists) {
                                return prev.map(d => d.id === updatedDeal.id ? { ...updatedDeal, _isUpdated: true } as any : d)
                            }

                            // If it didn't exist but is now active/escalated, add it
                            if (!exists && ['active', 'escalated'].includes(updatedDeal.status)) {
                                return [{ ...updatedDeal, _isNew: true } as any, ...prev].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                            }

                            return prev
                        })

                        if (mounted) {
                            setTimeout(() => {
                                setDeals(current =>
                                    current.map(d => d.id === updatedDeal.id ? { ...d, _isUpdated: false } : d)
                                )
                            }, 1000)
                        }
                    }
                    else if (payload.eventType === 'DELETE') {
                        setDeals(prev => prev.filter(d => d.id !== payload.old.id))
                    }
                }
            )
            .subscribe((status) => {
                setIsSubscribed(status === 'SUBSCRIBED')
            })

        return () => {
            mounted = false
            supabase.removeChannel(channel)
        }
    }, [developerId, supabase])

    const handleReconnect = () => {
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
            {/* Realtime loss indicator */}
            {!isSubscribed && (
                <button
                    onClick={handleReconnect}
                    className="absolute top-3 right-4 z-10 flex items-center gap-2 text-xs font-medium text-warning bg-warning-dim px-2 py-1 rounded-md border border-warning/30 hover:bg-warning/20 transition-colors"
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                    Live updates paused — click to reconnect
                </button>
            )}

            <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                    {/* Header */}
                    <div className="flex items-center h-10 px-4 border-b border-border-dim text-xs font-medium text-text-muted uppercase tracking-wider">
                        <div className="w-[120px] shrink-0">Deal ID</div>
                        <div className="flex-1 min-w-[200px]">Intent</div>
                        <div className="w-[120px] shrink-0">Status</div>
                        <div className="w-[140px] shrink-0">Handler</div>
                        <div className="w-[100px] shrink-0">Time Open</div>
                        <div className="w-[160px] shrink-0">Last Updated</div>
                    </div>

                    {/* Body */}
                    <div className="divide-y divide-border-dim">
                        {deals.map((deal: any) => (
                            <div
                                key={deal.id}
                                onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
                                className={`
                  flex items-center h-[60px] px-4 cursor-pointer transition-all duration-150 group relative
                  ${deal._isUpdated ? 'animate-pulse-highlight' : 'hover:bg-overlay'}
                `}
                            >
                                {/* ID */}
                                <div className="w-[120px] shrink-0 flex items-center gap-2 pr-4">
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
                                    {deal._isNew && (
                                        <span className="ml-3 inline-flex text-[10px] font-bold tracking-wider uppercase bg-electric/20 text-electric px-1.5 py-0.5 rounded animate-fade-up">
                                            New
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

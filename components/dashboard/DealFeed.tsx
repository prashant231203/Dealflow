'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { RelativeTime } from '@/components/shared/RelativeTime'

type ActivityEvent = {
    id: string
    deal_id: string
    actor: string
    action: string
    created_at: string
    intent: string
    value?: number | null
    statusColor: 'positive' | 'warning' | 'danger' | 'default' | 'acid'
}

interface DealFeedProps {
    initialEvents: ActivityEvent[]
    developerId: string
    initialActiveCount: number
}

function colorByAction(action: string): ActivityEvent['statusColor'] {
    if (action === 'accept' || action === 'close' || action === 'completed') return 'positive'
    if (action === 'reject' || action === 'cancel' || action === 'flag') return 'danger'
    if (action === 'escalate' || action === 'pause') return 'warning'
    if (action === 'offer' || action === 'counter') return 'acid'
    return 'default'
}

function extractValue(payload?: Record<string, unknown>) {
    if (!payload) return null
    const candidate = payload.price ?? payload.final_value
    if (typeof candidate === 'number') return candidate
    if (typeof candidate === 'string' && !Number.isNaN(Number(candidate))) return Number(candidate)
    return null
}

function actionText(action: string) {
    switch (action) {
        case 'offer':
            return 'made an offer of'
        case 'counter':
            return 'countered with'
        case 'accept':
            return 'accepted an offer at'
        case 'reject':
            return 'rejected an offer'
        case 'escalate':
            return 'escalated the deal'
        case 'close':
            return 'closed the deal at'
        default:
            return action.replace(/_/g, ' ')
    }
}

export function DealFeed({ initialEvents, developerId, initialActiveCount }: DealFeedProps) {
    const [events, setEvents] = useState<ActivityEvent[]>(initialEvents)
    const [activeCount, setActiveCount] = useState(initialActiveCount)

    const supabase = useMemo(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), [])

    useEffect(() => {
        const eventsChannel = supabase
            .channel(`live-activity-${developerId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'deal_events' },
                async (payload) => {
                    const incoming = payload.new as any
                    const { data: deal } = await supabase
                        .from('deals')
                        .select('id, intent, status')
                        .eq('id', incoming.deal_id)
                        .eq('developer_id', developerId)
                        .single()

                    if (!deal) return

                    const nextEvent: ActivityEvent = {
                        id: incoming.id,
                        deal_id: incoming.deal_id,
                        actor: incoming.actor || 'system',
                        action: incoming.action,
                        created_at: incoming.created_at,
                        intent: deal.intent,
                        value: extractValue(incoming.payload),
                        statusColor: colorByAction(incoming.action),
                    }

                    setEvents((prev) => [nextEvent, ...prev.filter((e) => e.id !== nextEvent.id)].slice(0, 50))
                }
            )
            .subscribe()

        const dealsChannel = supabase
            .channel(`live-active-count-${developerId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'deals',
                    filter: `developer_id=eq.${developerId}`,
                },
                () => {
                    supabase
                        .from('deals')
                        .select('id', { count: 'exact', head: true })
                        .eq('developer_id', developerId)
                        .in('status', ['active', 'escalated'])
                        .then(({ count }) => setActiveCount(count || 0))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(eventsChannel)
            supabase.removeChannel(dealsChannel)
        }
    }, [developerId, supabase])

    const dotClass = (tone: ActivityEvent['statusColor']) => {
        if (tone === 'positive') return 'bg-positive'
        if (tone === 'warning') return 'bg-warning'
        if (tone === 'danger') return 'bg-danger'
        if (tone === 'acid') return 'bg-electric shadow-[0_0_8px_var(--electric)]'
        return 'bg-text-muted'
    }

    return (
        <div className="rounded-xl border border-border-default bg-surface p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-border-dim pb-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">LIVE ACTIVITY</h2>
                <div className="font-mono text-xs text-text-muted">
                    <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-electric animate-status-pulse" />
                    {activeCount} active deals
                </div>
            </div>

            <div className="space-y-2" aria-live="polite">
                {events.length === 0 ? (
                    <div className="rounded-lg border border-border-dim bg-elevated px-4 py-6 text-sm text-text-secondary">
                        No events yet. Create a deal to start the stream.
                    </div>
                ) : (
                    events.map((event) => (
                        <div
                            key={event.id}
                            className="grid grid-cols-[10px_auto_90px] items-start gap-3 rounded-lg border border-transparent px-2 py-2 hover:border-border-dim animate-slide-in-top"
                        >
                            <span className={`mt-1.5 h-2 w-2 rounded-full ${dotClass(event.statusColor)}`} />

                            <div className="min-w-0 text-sm leading-6">
                                <span className="font-mono text-electric">{event.actor}</span>
                                <span className="mx-2 text-text-secondary">{actionText(event.action)}</span>
                                {typeof event.value === 'number' && (
                                    <span className="font-mono text-text-primary">${event.value.toLocaleString()}</span>
                                )}
                                <span className="mx-2 text-text-secondary">on</span>
                                <span className="truncate text-text-muted inline-block max-w-[65%] align-bottom" title={event.intent}>
                                    {event.intent}
                                </span>
                            </div>

                            <div className="text-right text-[11px] text-text-muted font-mono pt-1">
                                <RelativeTime timestamp={event.created_at} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

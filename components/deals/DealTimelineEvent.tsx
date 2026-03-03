'use client'

import { useState } from 'react'
import { DealEvent } from '@/types'
import { RelativeTime } from '@/components/shared/RelativeTime'
import { MessageSquare, FileText, CheckCircle2, XCircle, PauseCircle, PlayCircle, AlertTriangle, ArrowRightLeft, ShieldBan, Bot, User, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DealTimelineEvent({ event, isLast, isLatest, style }: { event: DealEvent; isLast: boolean; isLatest?: boolean; style?: React.CSSProperties }) {
    const [showAiSnapshot, setShowAiSnapshot] = useState(false)
    const payload = event.payload || {}
    const finalValue = payload.final_value
    const reason = payload.reason

    // Mapping action to styles and icons
    const getActionConfig = (action: string) => {
        switch (action) {
            case 'offer':
            case 'counter': return { icon: ArrowRightLeft, color: 'text-info', bg: 'bg-info/10' }
            case 'accept': return { icon: CheckCircle2, color: 'text-positive', bg: 'bg-positive/10' }
            case 'reject':
            case 'withdraw':
            case 'cancel': return { icon: XCircle, color: 'text-danger', bg: 'bg-danger/10' }
            case 'pause': return { icon: PauseCircle, color: 'text-warning', bg: 'bg-warning/10' }
            case 'resume_process': return { icon: PlayCircle, color: 'text-status-active', bg: 'bg-status-active/10' }
            case 'escalate': return { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' }
            case 'flag': return { icon: ShieldBan, color: 'text-danger', bg: 'bg-danger/10' }
            case 'note': return { icon: MessageSquare, color: 'text-text-secondary', bg: 'bg-elevated' }
            case 'system_expired':
            case 'system_offer_expired': return { icon: Clock, color: 'text-danger', bg: 'bg-danger/10' }
            case 'created': return { icon: FileText, color: 'text-electric', bg: 'bg-electric/10' }
            default: return { icon: FileText, color: 'text-text-muted', bg: 'bg-overlay' }
        }
    }

    const config = getActionConfig(event.action)
    const Icon = config.icon

    // Format the actor displaying (assume formatted like `agent_123` or generic text if system)
    const isAgent = event.actor.toLowerCase().includes('agent')
    const ActorIcon = isAgent ? Bot : User

    const money = (value: unknown) => {
        if (typeof value !== 'number' && typeof value !== 'string') return null
        const num = Number(value)
        if (isNaN(num)) return null
        return `$${num.toLocaleString()}`
    }

    const renderContent = () => {
        if (event.action === 'offer' || event.action === 'counter') {
            return (
                <div className="space-y-2">
                    <div className="text-[18px] font-mono text-text-primary">
                        {money(payload.price) || 'Offer updated'}
                    </div>
                    <div className="text-xs text-text-secondary font-mono">
                        {payload.quantity ? `${String(payload.quantity)} ${String(payload.unit || '')}` : 'quantity not specified'}
                    </div>
                    {Array.isArray(payload.conditions) && payload.conditions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {payload.conditions.map((condition, idx) => (
                                <span key={idx} className="rounded-full border border-border-dim bg-elevated px-2 py-0.5 text-[11px] text-text-secondary">
                                    {String(condition)}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )
        }

        if (event.action === 'accept') {
            return (
                <div className="text-sm">
                    <span className="text-positive">✓ Offer accepted</span>
                    {Boolean(finalValue) && <span className="ml-2 font-mono text-text-primary">at {money(finalValue)}</span>}
                </div>
            )
        }

        if (event.action === 'reject') {
            return (
                <div className="text-sm space-y-1">
                    <div className="text-danger">✗ Offer rejected</div>
                    {Boolean(reason) && <div className="text-text-secondary italic">{String(reason)}</div>}
                </div>
            )
        }

        if (event.action === 'escalate') {
            return (
                <div className="text-sm space-y-1">
                    <div className="text-text-primary">→ Sent to {String(payload.to || payload.agent || 'reviewer')}</div>
                    {Boolean(reason) && <div className="text-text-secondary italic">{String(reason)}</div>}
                </div>
            )
        }

        if (event.action === 'note') {
            return (
                <blockquote className="border-l border-border-bright pl-3 text-sm italic text-text-secondary">
                    {String(payload.note || payload.message || 'Note added')}
                </blockquote>
            )
        }

        if (event.action === 'close') {
            return (
                <div className="text-base text-positive">
                    ✓ Deal completed {finalValue ? `at ${money(finalValue)}` : ''}
                </div>
            )
        }

        return (
            <div className="text-sm text-text-secondary">
                {Object.keys(payload).length > 0
                    ? JSON.stringify(payload)
                    : 'No additional payload'}
            </div>
        )
    }

    return (
        <div className="relative pl-8 pt-4 pb-8 group animate-fade-up" style={{ animationFillMode: 'both', ...style }}>
            {/* Chronological line */}
            {!isLast && (
                <div className="absolute left-[15px] top-[40px] bottom-0 w-[2px] bg-border-dim group-hover:bg-border-default transition-colors" />
            )}

            {/* Node Icon */}
            <div className={cn("absolute left-0 top-[28px] w-8 h-8 rounded-full border-2 border-surface flex items-center justify-center z-10", config.bg)}>
                <Icon className={cn("w-4 h-4", config.color)} />
            </div>

            {/* Content wrapper */}
            <div className={cn("bg-surface border border-border-default hover:border-border-bright rounded-xl p-4 transition-colors", isLatest && 'bg-overlay/60')}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">

                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium uppercase tracking-wider text-text-primary bg-overlay px-2 py-0.5 rounded border border-border-dim">
                            {event.action.replace('_', ' ')}
                        </span>
                        {isLatest && (
                            <span className="text-[10px] uppercase font-bold tracking-widest text-electric bg-electric/20 px-1.5 py-0.5 rounded">
                                LATEST
                            </span>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <ActorIcon className="w-3.5 h-3.5" />
                            <span className="font-mono">{event.actor}</span>
                        </div>
                    </div>

                    <div className="text-xs text-text-muted flex items-center gap-2">
                        <span>#{event.sequence_number}</span>
                        <span>•</span>
                        <RelativeTime timestamp={event.created_at} />
                    </div>

                </div>

                {renderContent()}

                {/* AI Snapshot Collapsible */}
                {event.summary_after && event.summary_after !== event.summary_before && (
                    <div className="mt-3 pt-3 border-t border-border-dim">
                        <button
                            className="flex items-center gap-2 text-xs text-electric hover:text-white transition-colors"
                            onClick={() => setShowAiSnapshot(!showAiSnapshot)}
                        >
                            {showAiSnapshot ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            <span className="font-medium tracking-wide">AI snapshot at this moment</span>
                        </button>

                        {showAiSnapshot && (
                            <div className="mt-2 text-xs text-text-secondary bg-[#0A0A0F] border border-electric/20 rounded p-3 italic animate-fade-up">
                                "{event.summary_after}"
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

'use client'

import Link from 'next/link'
import { DealData } from '@/types'
import { RelativeTime } from '@/components/shared/RelativeTime'

type DealCardData = DealData & {
    offerCount?: number
    eventCount?: number
}

function statusTone(status: string) {
    if (status === 'active') return 'bg-electric shadow-[0_0_8px_var(--electric)]'
    if (status === 'escalated') return 'bg-status-escalated shadow-[0_0_8px_var(--status-escalated)]'
    if (status === 'paused') return 'bg-warning'
    if (status === 'closed') return 'bg-text-muted'
    if (status === 'expired' || status === 'cancelled') return 'bg-danger'
    return 'bg-text-muted'
}

function elapsedDays(start: string) {
    const ms = Date.now() - new Date(start).getTime()
    const days = Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)))
    return `${days}d open`
}

export function DealCard({
    deal,
    isNew,
    isUpdated,
}: {
    deal: DealCardData
    isNew?: boolean
    isUpdated?: boolean
}) {
    const budgetMin = Number(deal.constraints?.budget_min || 0)
    const budgetMax = Number(deal.constraints?.budget_max || 0)
    const bestOffer = Number(deal.current_best_offer?.price || 0)
    const showBudget = budgetMax > 0
    const position = showBudget
        ? Math.max(0, Math.min(100, ((bestOffer - budgetMin) / Math.max(1, budgetMax - budgetMin)) * 100))
        : 0

    const hasCriticalFlag = Array.isArray(deal.compliance_flags)
        ? deal.compliance_flags.some((flag) => flag?.severity === 'critical')
        : false

    const isEscalated = deal.status === 'escalated'
    const isClosed = ['closed', 'expired', 'cancelled'].includes(deal.status)

    return (
        <Link
            href={`/dashboard/deals/${deal.id}`}
            className={`block rounded-[10px] border p-4 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_10px_24px_rgba(0,0,0,0.35)]
            ${isEscalated ? 'border-status-escalated/50 animate-[compliance-pulse_3s_ease-in-out_infinite]' : 'border-border-default hover:border-border-bright'}
            ${hasCriticalFlag ? 'border-l-[3px] border-l-danger' : ''}
            ${isClosed ? 'opacity-65' : ''}
            ${isNew || isUpdated ? 'animate-flash-acid' : ''}
        `}
        >
            <div className="mb-4 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-xs text-text-secondary font-mono uppercase">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusTone(deal.status)} ${deal.status === 'active' ? 'animate-status-pulse' : ''}`} />
                    {deal.status}
                </div>
                <span className="text-xs text-text-secondary font-mono">{deal.current_handler || 'unassigned'}</span>
            </div>

            <h3 className="line-clamp-2 text-sm leading-6 text-text-primary min-h-12">{deal.intent}</h3>

            {showBudget && (
                <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-text-muted font-mono">
                        <span>${budgetMin.toLocaleString('en-US')}</span>
                        <span>${budgetMax.toLocaleString('en-US')}</span>
                    </div>
                    <div className="relative h-1 rounded-full bg-border-default overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-positive to-warning" style={{ width: '100%' }} />
                        <span className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-bg-void bg-text-primary" style={{ left: `calc(${position}% - 5px)` }} />
                    </div>
                    {bestOffer > 0 && (
                        <div className="text-[11px] text-text-secondary font-mono">
                            best offer: <span className="text-text-primary">${bestOffer.toLocaleString('en-US')}</span>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-4 flex items-center justify-between text-[11px] text-text-muted font-mono">
                <span>
                    {(deal.offerCount || 0)} offers · {(deal.eventCount || 0)} events · {elapsedDays(deal.created_at)}
                </span>
                <RelativeTime timestamp={deal.updated_at} />
            </div>
        </Link>
    )
}

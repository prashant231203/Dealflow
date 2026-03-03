import { Sparkles } from 'lucide-react'
import { RelativeTime } from '@/components/shared/RelativeTime'

interface AiSummaryPanelProps {
    summary?: string
    updatedAt?: string
    pendingOffers?: number
    flagsCount?: number
    isRefreshing?: boolean
}

export function AiSummaryPanel({
    summary,
    updatedAt,
    pendingOffers = 0,
    flagsCount = 0,
    isRefreshing = false,
}: AiSummaryPanelProps) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-electric/40 bg-gradient-to-b from-[rgba(173,255,47,0.02)] to-surface">
            <div className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-electric">
                        <Sparkles className="h-4 w-4" />
                        ⬡ Intelligence
                    </div>
                    <div className="text-[11px] font-mono text-text-muted">
                        {updatedAt ? <RelativeTime timestamp={updatedAt} /> : 'just now'}
                    </div>
                </div>

                <div className={`text-sm leading-7 text-text-secondary ${isRefreshing ? 'animate-shimmer' : ''}`}>
                    {summary && summary.trim().length > 0
                        ? summary
                        : 'Waiting for enough context to generate an intelligence brief.'}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <button className="rounded-full border border-border-dim bg-elevated px-3 py-1 text-xs text-text-secondary hover:border-border-bright hover:text-text-primary">
                        ✓ {pendingOffers} pending offers
                    </button>
                    <button className={`rounded-full border px-3 py-1 text-xs ${flagsCount > 0 ? 'border-warning/40 bg-warning-dim text-warning' : 'border-border-dim bg-elevated text-text-secondary'}`}>
                        ⚠ {flagsCount} flag{flagsCount === 1 ? '' : 's'}
                    </button>
                </div>
            </div>
        </div>
    )
}

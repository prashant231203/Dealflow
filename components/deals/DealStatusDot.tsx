import { cn } from "@/lib/utils"

export type DealStatus = 'active' | 'paused' | 'escalated' | 'closed' | 'expired' | 'cancelled' | string

interface DealStatusDotProps {
    status: DealStatus
    className?: string
}

export function DealStatusDot({ status, className }: DealStatusDotProps) {
    const normalized = status.toLowerCase()

    const map = {
        active: { color: 'text-status-active', bg: 'bg-status-active', glow: 'shadow-[0_0_6px_var(--status-active)] text-status-active', text: 'Active' },
        paused: { color: 'text-status-paused', bg: 'bg-status-paused', glow: '', text: 'Paused' },
        escalated: { color: 'text-status-escalated', bg: 'bg-status-escalated', glow: '', text: 'Needs Review' },
        closed: { color: 'text-status-closed', bg: 'bg-status-closed', glow: '', text: 'Closed' },
        expired: { color: 'text-status-expired', bg: 'bg-status-expired', glow: '', text: 'Expired' },
        cancelled: { color: 'text-status-cancelled', bg: 'bg-status-cancelled', glow: '', text: 'Cancelled' },
    } as Record<string, { color: string, bg: string, glow: string, text: string }>

    const style = map[normalized] || { color: 'text-text-muted', bg: 'bg-text-muted', glow: '', text: status }

    return (
        <div className={cn("inline-flex items-center gap-2", className)}>
            <div
                className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    style.bg,
                    style.glow,
                    normalized === 'active' && 'animate-[pulse-highlight_2s_infinite_ease-out]' // special pulsing for active
                )}
            />
            <span className={cn("text-xs font-medium font-sans capitalize", style.color)}>
                {style.text}
            </span>
        </div>
    )
}

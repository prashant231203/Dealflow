'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import * as Icons from 'lucide-react'

export function useCountUp(target: number, duration: number = 800) {
    const [count, setCount] = useState(0)

    useEffect(() => {
        if (target === 0) {
            setCount(0)
            return
        }

        const start = Date.now()
        const timer = setInterval(() => {
            const elapsed = Date.now() - start
            const progress = Math.min(elapsed / duration, 1)
            // Ease out: starts fast, slows down
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * target))
            if (progress >= 1) clearInterval(timer)
        }, 16) // ~60fps
        return () => clearInterval(timer)
    }, [target, duration])

    return count
}

interface StatCardProps {
    label: string
    value: number | string
    trend?: string | null
    iconName: keyof typeof Icons
    colorKey: 'active' | 'closed' | 'info' | 'warning'
    isCurrency?: boolean
}

export function StatCard({ label, value, trend, iconName, colorKey, isCurrency }: StatCardProps) {
    // Determine target number for numeric values to pass to hook
    const targetVal = typeof value === 'number' ? value : 0
    const displayValue = useCountUp(targetVal, 800)

    const borderColors = {
        active: 'border-l-status-active shadow-[-4px_0_12px_var(--status-active)]',
        closed: 'border-l-status-closed',
        info: 'border-l-info',
        warning: 'border-l-warning'
    }

    const trendColors = trend?.startsWith('+') ? 'text-positive' : trend?.startsWith('-') ? 'text-danger' : 'text-text-muted'

    return (
        <div className={cn(
            "bg-surface border border-border-default rounded-[10px] p-6 transition-all duration-300",
            `border-l-4 ${borderColors[colorKey]}`
        )}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold tracking-[0.08em] uppercase text-text-muted">
                    {label}
                </h3>
                {Icons[iconName] && (() => {
                    const ResolvedIcon = Icons[iconName] as any
                    return <ResolvedIcon className="w-4 h-4 text-text-muted" />
                })()}
            </div>

            <div className="flex items-baseline gap-1 mb-2">
                {isCurrency && typeof value === 'number' && <span className="text-[20px] font-display text-text-secondary">$</span>}
                <div className="text-4xl font-display text-text-primary tabular-nums">
                    {typeof value === 'number' ? displayValue.toLocaleString() : value}
                </div>
            </div>

            {trend && (
                <div className={cn("text-xs font-medium space-x-1", trendColors)}>
                    <span>{trend}</span>
                </div>
            )}
        </div>
    )
}

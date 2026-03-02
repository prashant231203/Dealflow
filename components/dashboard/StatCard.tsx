'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

import * as Icons from 'lucide-react'

interface StatCardProps {
    label: string
    value: number | string
    trend?: string
    trendValue?: number
    iconName: keyof typeof Icons
    colorKey: 'active' | 'closed' | 'info' | 'warning'
    isCurrency?: boolean
}

export function StatCard({ label, value, trend, trendValue, iconName, colorKey, isCurrency }: StatCardProps) {
    const [displayValue, setDisplayValue] = useState(0)

    // Animated counter
    useEffect(() => {
        if (typeof value !== 'number') return

        let start = 0
        const end = value
        const duration = 800
        const startObj = performance.now()

        const animate = (time: number) => {
            let progress = (time - startObj) / duration
            if (progress > 1) progress = 1

            // easeOutExpo
            const easing = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
            setDisplayValue(Math.floor(end * easing))

            if (progress < 1) {
                requestAnimationFrame(animate)
            } else {
                setDisplayValue(end)
            }
        }

        requestAnimationFrame(animate)
    }, [value])

    const borderColors = {
        active: 'border-l-status-active shadow-[-4px_0_12px_var(--status-active)]', // actually mapping glowing shadows internally if needed, but per specs we want specific borders
        closed: 'border-l-status-closed',
        info: 'border-l-info',
        warning: 'border-l-warning'
    }

    const trendColors = (trendValue || 0) >= 0 ? 'text-positive' : 'text-danger'

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

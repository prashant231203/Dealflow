'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { RefreshCw, ArrowLeft } from 'lucide-react'
import { useState, useEffect } from 'react'

export function Topbar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Derive breadcrumbs from URL
    const segments = pathname.split('/').filter(Boolean)
    // Example path: /dashboard/deals/deal_123
    // segments = ['dashboard', 'deals', 'deal_123']

    const handleRefresh = () => {
        setIsRefreshing(true)
        router.refresh()
        setTimeout(() => setIsRefreshing(false), 500)
    }

    // Hide topbar completely if exactly at `/dashboard` (home) to give more room?
    // Actually, UI specs said Topbar is generic throughout, except the Deal Detail has breadcrumbs and "Back".
    // Let's implement dynamic mappings.

    const isDeepView = segments.length > 2

    const formatSegment = (str: string, index: number) => {
        if (str === 'dashboard') return 'Dashboard'
        if (str === 'deals') return 'Deals'
        if (str === 'analytics') return 'Analytics'
        if (str === 'webhooks') return 'Webhooks'
        if (str === 'keys') return 'API Keys'

        // UUID or Deal ID segment
        if (index === 2) {
            if (str.startsWith('deal_')) {
                return str.slice(0, 14) + '...'
            }
            return str
        }
        return str.charAt(0).toUpperCase() + str.slice(1)
    }

    return (
        <header className="h-14 min-h-[56px] border-b border-border-dim bg-bg-void/50 backdrop-blur-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">

            {/* Left side: Back button (if deep) + Breadcrumbs */}
            <div className="flex items-center gap-4">
                {isDeepView && (
                    <button
                        onClick={() => router.back()}
                        className="hidden md:flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-electric px-2 py-1 -ml-2 rounded-md"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-medium mt-0.5">Back</span>
                    </button>
                )}

                <div className="flex items-center gap-2 text-xs md:text-sm">
                    {segments.map((segment, i) => {
                        const isLast = i === segments.length - 1
                        const href = '/' + segments.slice(0, i + 1).join('/')

                        return (
                            <div key={href} className="flex items-center gap-2">
                                {i > 0 && <span className="text-text-muted select-none">/</span>}
                                {isLast ? (
                                    <span className={`font-mono text-text-muted ${i === 2 && segment.startsWith('deal_') ? 'text-xs' : ''}`}>
                                        {formatSegment(segment, i)}
                                    </span>
                                ) : (
                                    <Link
                                        href={href}
                                        className="text-text-secondary hover:text-text-primary transition-colors hover:underline underline-offset-4"
                                    >
                                        {formatSegment(segment, i)}
                                    </Link>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Right side: Global Refresh */}
            <div>
                <button
                    onClick={handleRefresh}
                    className="flex items-center gap-2 text-xs md:text-sm text-text-secondary border border-border-dim rounded-md px-3 py-1.5 hover:bg-elevated hover:text-text-primary transition-colors focus-visible:outline-electric"
                    title="Refresh current data (R)"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-electric' : ''}`} />
                    <span className="hidden md:inline font-medium">Refresh</span>
                </button>
            </div>

        </header>
    )
}

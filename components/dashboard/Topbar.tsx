'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const NAV_ITEMS = [
    { name: 'Overview', href: '/dashboard' },
    { name: 'Deals', href: '/dashboard/deals' },
    { name: 'Analytics', href: '/dashboard/analytics' },
    { name: 'Webhooks', href: '/dashboard/webhooks' },
    { name: 'Keys', href: '/dashboard/keys' },
]

export function Topbar({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
    const pathname = usePathname()
    const router = useRouter()
    const [userEmail, setUserEmail] = useState<string | null>(null)

    const supabase = useMemo(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), [])

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserEmail(data.user?.email || null)
        })
    }, [supabase.auth])

    const initials = (userEmail || 'D').trim().charAt(0).toUpperCase()

    const isActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard'
        return pathname.startsWith(href)
    }

    return (
        <header className="sticky top-0 z-30 h-12 min-h-12 border-b border-border-dim bg-bg-void px-3 md:px-6">
            <div className="h-full grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="justify-self-start inline-flex items-center gap-2 text-left"
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-electric animate-status-pulse" />
                    <span className="text-[13px] font-semibold tracking-[0.08em] text-text-primary uppercase">
                        DEALFLOW
                    </span>
                </button>

                <nav className="justify-self-center hidden md:flex items-center gap-1.5">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`h-8 px-3 rounded-full border text-[13px] inline-flex items-center ${isActive(item.href)
                                ? 'bg-overlay border-border-bright text-text-primary'
                                : 'bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:border-border-dim'
                                }`}
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="justify-self-end flex items-center gap-2">
                    <button
                        onClick={onOpenCommandPalette}
                        className="h-8 px-2.5 rounded-md border border-border-bright text-electric text-xs font-medium hover:bg-electric-dim"
                        aria-label="Open command palette"
                    >
                        ⌘K
                    </button>

                    <button
                        onClick={() => router.push('/dashboard/keys')}
                        className="h-8 w-8 rounded-full border border-border-bright bg-overlay text-electric text-xs font-mono"
                        aria-label="Account"
                    >
                        {initials}
                    </button>
                </div>
            </div>
        </header>
    )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Command } from 'cmdk'
import { Portal } from '@/components/shared/Portal'

type DealResult = {
    id: string
    intent: string
}

const NAV_ITEMS = [
    { label: 'Overview', href: '/dashboard' },
    { label: 'Deals', href: '/dashboard/deals' },
    { label: 'Analytics', href: '/dashboard/analytics' },
    { label: 'Webhooks', href: '/dashboard/webhooks' },
    { label: 'Keys', href: '/dashboard/keys' },
]

export function CommandPalette({
    isOpen,
    onOpenChange,
}: {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}) {
    const router = useRouter()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<DealResult[]>([])
    const [lastDealId, setLastDealId] = useState<string | null>(null)

    const supabase = useMemo(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), [])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault()
                onOpenChange(!isOpen)
            }
            if (event.key === 'Escape' && isOpen) {
                onOpenChange(false)
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isOpen, onOpenChange])

    useEffect(() => {
        if (!isOpen) return
        supabase
            .from('deals')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)
            .then(({ data }) => {
                setLastDealId(data?.[0]?.id ?? null)
            })
    }, [isOpen, supabase])

    useEffect(() => {
        if (!isOpen) return
        if (!query.trim()) {
            setResults([])
            return
        }

        const timer = setTimeout(async () => {
            const { data: userData } = await supabase.auth.getUser()
            const userId = userData.user?.id
            if (!userId) return

            const { data } = await supabase
                .from('deals')
                .select('id, intent')
                .eq('developer_id', userId)
                .ilike('intent', `%${query.trim()}%`)
                .order('updated_at', { ascending: false })
                .limit(8)

            setResults((data as DealResult[]) || [])
        }, 200)

        return () => clearTimeout(timer)
    }, [isOpen, query, supabase])

    const closeAndGo = (href: string) => {
        onOpenChange(false)
        setQuery('')
        router.push(href)
    }

    const copyLastDealId = async () => {
        if (!lastDealId) return
        await navigator.clipboard.writeText(lastDealId)
        onOpenChange(false)
    }

    const createDeal = () => {
        onOpenChange(false)
        router.push('/dashboard/deals?create=1')
    }

    if (!isOpen) return null

    return (
        <Portal>
            <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true">
                <div
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={() => onOpenChange(false)}
                />

                <div className="absolute left-1/2 top-[20%] w-[min(560px,calc(100vw-24px))] -translate-x-1/2">
                    <Command className="overflow-hidden rounded-xl border border-border-bright bg-overlay shadow-[0_24px_48px_rgba(0,0,0,0.8),var(--acid-glow)] animate-fade-up">
                        <Command.Input
                            value={query}
                            onValueChange={setQuery}
                            placeholder="Search deals, navigate, run commands..."
                            className="h-12 w-full border-b border-border-dim bg-transparent px-4 text-[15px] text-text-primary outline-none placeholder:text-text-muted font-sans"
                        />

                        <Command.List className="max-h-[420px] overflow-y-auto p-2">
                            <Command.Empty className="px-3 py-6 text-sm text-text-secondary">
                                No matching commands or deals.
                            </Command.Empty>

                            {!query.trim() ? (
                                <>
                                    <Command.Group heading="Navigation" className="px-1 py-1 text-xs text-text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-1">
                                        {NAV_ITEMS.map((item) => (
                                            <Command.Item
                                                key={item.href}
                                                onSelect={() => closeAndGo(item.href)}
                                                className="relative flex cursor-pointer items-center rounded-md px-3 py-2 text-sm text-text-secondary outline-none data-[selected=true]:bg-elevated data-[selected=true]:text-text-primary data-[selected=true]:border-l-2 data-[selected=true]:border-l-electric"
                                            >
                                                {item.label}
                                            </Command.Item>
                                        ))}
                                    </Command.Group>

                                    <Command.Group heading="Actions" className="px-1 py-1 text-xs text-text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-3">
                                        <Command.Item
                                            onSelect={createDeal}
                                            className="relative flex cursor-pointer items-center rounded-md px-3 py-2 text-sm text-text-secondary outline-none data-[selected=true]:bg-elevated data-[selected=true]:text-text-primary data-[selected=true]:border-l-2 data-[selected=true]:border-l-electric"
                                        >
                                            + Create New Deal
                                        </Command.Item>
                                        <Command.Item
                                            onSelect={copyLastDealId}
                                            className="relative flex cursor-pointer items-center rounded-md px-3 py-2 text-sm text-text-secondary outline-none data-[selected=true]:bg-elevated data-[selected=true]:text-text-primary data-[selected=true]:border-l-2 data-[selected=true]:border-l-electric"
                                        >
                                            Copy Last Deal ID
                                        </Command.Item>
                                        <Command.Item
                                            onSelect={() => {
                                                onOpenChange(false)
                                                router.refresh()
                                            }}
                                            className="relative flex cursor-pointer items-center rounded-md px-3 py-2 text-sm text-text-secondary outline-none data-[selected=true]:bg-elevated data-[selected=true]:text-text-primary data-[selected=true]:border-l-2 data-[selected=true]:border-l-electric"
                                        >
                                            Refresh
                                        </Command.Item>
                                    </Command.Group>
                                </>
                            ) : (
                                <Command.Group heading="Deals" className="px-1 py-1 text-xs text-text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-1">
                                    {results.map((deal) => (
                                        <Command.Item
                                            key={deal.id}
                                            value={`${deal.intent} ${deal.id}`}
                                            onSelect={() => closeAndGo(`/dashboard/deals/${deal.id}`)}
                                            className="relative flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-text-secondary outline-none data-[selected=true]:bg-elevated data-[selected=true]:text-text-primary data-[selected=true]:border-l-2 data-[selected=true]:border-l-electric"
                                        >
                                            <span className="truncate pr-3">{deal.intent}</span>
                                            <span className="font-mono text-[11px] text-text-muted">{deal.id.slice(0, 12)}...</span>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            )}
                        </Command.List>
                    </Command>
                </div>
            </div>
        </Portal>
    )
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { DealCard } from '@/components/deals/DealCard'
import { DealData } from '@/types'

type CanvasDeal = DealData & { offerCount?: number; eventCount?: number }

const FILTERS = ['all', 'active', 'escalated', 'paused', 'closed'] as const

function rankStatus(status: string) {
    if (status === 'escalated') return 0
    if (status === 'active') return 1
    if (status === 'paused') return 2
    if (status === 'closed') return 3
    if (status === 'expired' || status === 'cancelled') return 4
    return 5
}

export function DealsCanvasClient({
    initialDeals,
    developerId,
}: {
    initialDeals: CanvasDeal[]
    developerId: string
}) {
    const [deals, setDeals] = useState<CanvasDeal[]>(initialDeals)
    const [newDealIds, setNewDealIds] = useState<Record<string, true>>({})
    const [updatedDealIds, setUpdatedDealIds] = useState<Record<string, true>>({})

    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const status = (searchParams.get('status') || 'all').toLowerCase()
    const search = (searchParams.get('search') || '').toLowerCase().trim()
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const supabase = useMemo(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), [])

    useEffect(() => {
        const channel = supabase
            .channel(`deals-canvas-${developerId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'deals', filter: `developer_id=eq.${developerId}` },
                (payload) => {
                    const inserted = payload.new as CanvasDeal
                    setDeals((prev) => [inserted, ...prev.filter((d) => d.id !== inserted.id)])
                    setNewDealIds((prev) => ({ ...prev, [inserted.id]: true }))
                    setTimeout(() => {
                        setNewDealIds((prev) => {
                            const next = { ...prev }
                            delete next[inserted.id]
                            return next
                        })
                    }, 2000)
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'deals', filter: `developer_id=eq.${developerId}` },
                (payload) => {
                    const updated = payload.new as CanvasDeal
                    setDeals((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)))
                    setUpdatedDealIds((prev) => ({ ...prev, [updated.id]: true }))
                    setTimeout(() => {
                        setUpdatedDealIds((prev) => {
                            const next = { ...prev }
                            delete next[updated.id]
                            return next
                        })
                    }, 2000)
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'deals', filter: `developer_id=eq.${developerId}` },
                (payload) => {
                    setDeals((prev) => prev.filter((d) => d.id !== payload.old.id))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [developerId, supabase])

    const filteredDeals = useMemo(() => {
        return deals
            .filter((deal) => {
                if (status !== 'all' && deal.status !== status) return false
                if (search && !deal.intent.toLowerCase().includes(search)) return false
                return true
            })
            .sort((a, b) => {
                const rankDiff = rankStatus(a.status) - rankStatus(b.status)
                if (rankDiff !== 0) return rankDiff
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            })
    }, [deals, search, status])

    const setFilter = (nextStatus: string) => {
        const params = new URLSearchParams(searchParams)
        if (nextStatus === 'all') params.delete('status')
        else params.set('status', nextStatus)
        router.push(`${pathname}?${params.toString()}`)
    }

    const setSearch = (value: string) => {
        const params = new URLSearchParams(searchParams)
        if (value) params.set('search', value)
        else params.delete('search')
        router.push(`${pathname}?${params.toString()}`)
    }

    useEffect(() => {
        const id = setTimeout(() => {
            const input = document.getElementById('deal-canvas-search') as HTMLInputElement | null
            if (!input) return
            if (input.value.toLowerCase() !== search) {
                input.value = searchParams.get('search') || ''
            }
        }, 0)
        return () => clearTimeout(id)
    }, [search, searchParams])

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-wide ${status === f
                                ? 'border-border-bright bg-overlay text-text-primary'
                                : 'border-border-dim text-text-secondary hover:border-border-bright hover:text-text-primary'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <input
                    id="deal-canvas-search"
                    type="text"
                    defaultValue={searchParams.get('search') || ''}
                    placeholder="Search..."
                    onChange={(e) => {
                        const value = e.target.value
                        if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
                        searchTimerRef.current = setTimeout(() => setSearch(value), 200)
                    }}
                    className="h-9 w-full md:w-72 rounded-md border border-border-dim bg-surface px-3 text-sm text-text-primary outline-none focus:border-border-bright"
                />
            </div>

            {filteredDeals.length === 0 ? (
                <div className="rounded-xl border border-border-default bg-surface px-4 py-8 text-center text-sm text-text-secondary">
                    No deals match this filter.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredDeals.map((deal) => (
                        <DealCard
                            key={deal.id}
                            deal={deal}
                            isNew={!!newDealIds[deal.id]}
                            isUpdated={!!updatedDealIds[deal.id]}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

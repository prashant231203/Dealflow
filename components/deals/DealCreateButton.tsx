'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Portal } from '@/components/shared/Portal'
import type { DealType } from '@/types'

const DEAL_TYPES: DealType[] = ['negotiation', 'procurement', 'sales', 'return', 'custom']

export function DealCreateButton() {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [intent, setIntent] = useState('')
    const [type, setType] = useState<DealType>('negotiation')
    const [budgetMin, setBudgetMin] = useState('')
    const [budgetMax, setBudgetMax] = useState('')
    const [currency, setCurrency] = useState('USD')
    const [requirements, setRequirements] = useState('')
    const [tags, setTags] = useState('')

    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const shouldAutoOpen = searchParams.get('create') === '1'

    useEffect(() => {
        if (shouldAutoOpen) setIsOpen(true)
    }, [shouldAutoOpen])

    const closeModal = () => {
        setIsOpen(false)
        setError(null)
        if (searchParams.get('create') === '1') {
            const params = new URLSearchParams(searchParams)
            params.delete('create')
            const next = params.toString()
            router.replace(next ? `${pathname}?${next}` : pathname)
        }
    }

    const payload = useMemo(() => {
        const min = budgetMin.trim().length > 0 ? Number(budgetMin) : undefined
        const max = budgetMax.trim().length > 0 ? Number(budgetMax) : undefined
        const reqList = requirements
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        const tagList = tags
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)

        return {
            type,
            intent,
            constraints: {
                ...(Number.isFinite(min) ? { budget_min: min } : {}),
                ...(Number.isFinite(max) ? { budget_max: max } : {}),
                ...(currency.trim() ? { currency: currency.trim().toUpperCase() } : {}),
                ...(reqList.length > 0 ? { requirements: reqList } : {}),
            },
            ...(tagList.length > 0 ? { tags: tagList } : {}),
        }
    }, [budgetMax, budgetMin, currency, intent, requirements, tags, type])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!intent.trim()) {
            setError('Intent is required')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/dashboard/deals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data?.error ?? 'Failed to create deal')
            }

            closeModal()
            router.push(`/dashboard/deals/${data.deal.id}`)
            router.refresh()
        } catch (err: any) {
            setError(err?.message ?? 'Failed to create deal')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 rounded-md border border-electric bg-electric-dim px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-electric hover:bg-electric hover:text-black"
            >
                <Plus className="h-3.5 w-3.5" />
                New Deal
            </button>

            {isOpen && (
                <Portal>
                    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" role="dialog" aria-modal="true">
                        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={closeModal} />

                        <form onSubmit={handleCreate} className="relative w-full max-w-xl rounded-xl border border-border-bright bg-surface shadow-2xl">
                            <div className="flex items-center justify-between border-b border-border-dim px-5 py-4">
                                <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-text-primary">Create Deal</h2>
                                <button type="button" onClick={closeModal} className="text-text-muted hover:text-text-primary">✕</button>
                            </div>

                            <div className="space-y-4 p-5">
                                <div>
                                    <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-text-muted">Intent</label>
                                    <textarea
                                        value={intent}
                                        onChange={(e) => setIntent(e.target.value)}
                                        placeholder="Procure 500 enterprise routers under annual agreement"
                                        className="min-h-24 w-full rounded-md border border-border-dim bg-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-border-bright"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-text-muted">Type</label>
                                        <select
                                            value={type}
                                            onChange={(e) => setType(e.target.value as DealType)}
                                            className="h-10 w-full rounded-md border border-border-dim bg-elevated px-3 text-sm text-text-primary outline-none focus:border-border-bright"
                                        >
                                            {DEAL_TYPES.map((t) => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-text-muted">Currency</label>
                                        <input
                                            value={currency}
                                            onChange={(e) => setCurrency(e.target.value)}
                                            className="h-10 w-full rounded-md border border-border-dim bg-elevated px-3 text-sm text-text-primary outline-none focus:border-border-bright"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-text-muted">Budget Min</label>
                                        <input value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} type="number" min="0" className="h-10 w-full rounded-md border border-border-dim bg-elevated px-3 text-sm text-text-primary outline-none focus:border-border-bright" />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-text-muted">Budget Max</label>
                                        <input value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} type="number" min="0" className="h-10 w-full rounded-md border border-border-dim bg-elevated px-3 text-sm text-text-primary outline-none focus:border-border-bright" />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-text-muted">Requirements (comma separated)</label>
                                    <input value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="ISO_9001, 24x7 support" className="h-10 w-full rounded-md border border-border-dim bg-elevated px-3 text-sm text-text-primary outline-none focus:border-border-bright" />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-text-muted">Tags (comma separated)</label>
                                    <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="priority, q2" className="h-10 w-full rounded-md border border-border-dim bg-elevated px-3 text-sm text-text-primary outline-none focus:border-border-bright" />
                                </div>

                                {error && <div className="rounded-md border border-danger/30 bg-danger-dim px-3 py-2 text-sm text-danger">{error}</div>}
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t border-border-dim px-5 py-4">
                                <button type="button" onClick={closeModal} className="rounded-md border border-border-dim px-3 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
                                <button disabled={isLoading} className="rounded-md border border-electric bg-electric px-3 py-2 text-sm font-semibold text-black disabled:opacity-60">
                                    {isLoading ? 'Creating…' : 'Create Deal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </Portal>
            )}
        </>
    )
}

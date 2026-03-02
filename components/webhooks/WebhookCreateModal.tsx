'use client'

import { useState } from 'react'
import { Webhook, EyeOff, CheckCircle2 } from 'lucide-react'
import { CopyButton } from '@/components/shared/CopyButton'

interface WebhookCreateModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

const AVAILABLE_EVENTS = [
    { id: 'deal.*', label: 'All Deal Events', desc: 'Fires on every deal action' },
    { id: 'deal.created', label: 'Deal Created', desc: 'When a new deal is instantiated' },
    { id: 'deal.offer.accept', label: 'Offer Accepted', desc: 'When pricing terms are finalized' },
    { id: 'deal.completed', label: 'Deal Completed', desc: 'When the flow reaches terminal state' },
    { id: 'deal.escalated', label: 'Escalations', desc: 'When an agent needs human review' },
    { id: 'deal.flagged', label: 'Compliance Flags', desc: 'When bounds or rules are broken' },
]

export function WebhookCreateModal({ isOpen, onClose, onSuccess }: WebhookCreateModalProps) {
    const [url, setUrl] = useState('')
    const [description, setDescription] = useState('')
    const [selectedEvents, setSelectedEvents] = useState<string[]>(['deal.*'])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [createdSecret, setCreatedSecret] = useState<string | null>(null)

    if (!isOpen) return null

    const handleToggleEvent = (id: string) => {
        // If selecting wildcard, clear others
        if (id === 'deal.*') {
            setSelectedEvents(['deal.*'])
            return
        }
        // If tracking specific, remove wildcard
        if (selectedEvents.includes('deal.*')) {
            setSelectedEvents([id])
            return
        }

        if (selectedEvents.includes(id)) {
            setSelectedEvents(prev => prev.filter(e => e !== id))
        } else {
            setSelectedEvents(prev => [...prev, id])
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (selectedEvents.length === 0) {
            setError('You must select at least one event type.')
            return
        }

        setIsLoading(true)

        try {
            const res = await fetch('/api/v1/webhooks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    events: selectedEvents,
                    description
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error?.message || 'Failed to create webhook')
            }

            setCreatedSecret(data.webhook.secret)
            onSuccess()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        setCreatedSecret(null)
        setUrl('')
        setDescription('')
        setSelectedEvents(['deal.*'])
        setError(null)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div
                className="absolute inset-0 bg-bg-void/80 backdrop-blur-sm transition-opacity"
                onClick={createdSecret ? undefined : handleClose}
            />

            <div className="relative bg-surface border border-border-bright rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-fade-up my-8">
                {!createdSecret ? (
                    <form onSubmit={handleCreate}>
                        <div className="p-6 border-b border-border-dim flex justify-between items-center bg-overlay/30 sticky top-0 z-10">
                            <h2 className="font-display font-medium text-lg text-text-primary flex items-center gap-2">
                                <Webhook className="w-5 h-5 text-electric" />
                                Add Endpoint
                            </h2>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="text-text-muted hover:text-text-primary transition-colors focus-visible:outline-electric"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Payload URL</label>
                                <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://api.yourdomain.com/webhooks/dealflow"
                                    className="w-full bg-elevated border border-border-dim rounded-md px-3 py-2 text-text-primary focus:outline-none focus:border-border-bright focus:ring-1 focus:ring-electric transition-colors font-mono text-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Description (Optional)</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. Updates core user intent sync"
                                    className="w-full bg-elevated border border-border-dim rounded-md px-3 py-2 text-text-primary focus:outline-none focus:border-border-bright focus:ring-1 focus:ring-electric transition-colors text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-3">Events to send</label>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {AVAILABLE_EVENTS.map(ev => {
                                        const isSelected = selectedEvents.includes(ev.id)
                                        return (
                                            <div
                                                key={ev.id}
                                                onClick={() => handleToggleEvent(ev.id)}
                                                className={`border rounded-lg p-3 cursor-pointer transition-colors ${isSelected ? 'bg-electric-dim border-electric/40 shadow-[inset_2px_0_0_0_var(--electric)]' : 'bg-elevated border-border-dim hover:border-border-bright'
                                                    }`}
                                            >
                                                <div className={`font-mono text-[11px] mb-1 font-bold ${isSelected ? 'text-electric' : 'text-text-primary'}`}>
                                                    {ev.id}
                                                </div>
                                                <div className="text-xs text-text-muted leading-tight">
                                                    {ev.desc}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {error && (
                                <div className="text-danger bg-danger-dim border border-danger/30 p-3 rounded text-sm mb-4">
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border-dim bg-overlay/30 flex justify-end gap-3 sticky bottom-0 z-10">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 rounded-md border border-border-dim text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 bg-electric text-black font-bold text-sm rounded-md hover:bg-white active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : 'Add Endpoint'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div>
                        <div className="p-6 border-b border-border-dim flex items-center justify-between bg-overlay/30">
                            <h2 className="font-display font-medium text-lg text-positive flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5" />
                                Webhook Created
                            </h2>
                        </div>

                        <div className="p-6 text-center">
                            <div className="mb-4">
                                <h3 className="text-xl font-display text-text-primary mb-2">Endpoint verification required</h3>
                                <p className="text-text-secondary text-sm leading-relaxed max-w-sm mx-auto mb-6">
                                    We use HMAC SHA-256 signatures to verify webhook payloads. Save this signing secret on your server.
                                </p>
                            </div>

                            <div className="bg-elevated border border-border-bright rounded-lg p-4 flex items-center justify-between gap-4 mb-8 shadow-[0_0_15px_var(--electric-dim)] mx-auto w-fit max-w-full">
                                <code className="text-electric font-mono text-sm break-all font-bold tracking-wide">
                                    {createdSecret}
                                </code>
                                <CopyButton value={createdSecret} size="md" className="shrink-0" />
                            </div>

                            <div className="bg-warning-dim border border-warning/30 text-warning px-4 py-3 rounded-lg flex items-center justify-center gap-3 text-sm">
                                <EyeOff className="w-4 h-4" />
                                This secret will never be shown again.
                            </div>
                        </div>

                        <div className="p-4 border-t border-border-dim bg-overlay/30">
                            <button
                                onClick={handleClose}
                                className="w-full py-2.5 bg-electric text-black font-bold text-sm rounded-md hover:bg-white transition-colors"
                            >
                                I've saved the signing secret securely
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

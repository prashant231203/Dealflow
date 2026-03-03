'use client'

import { useState } from 'react'
import { PlusSquare, EyeOff, CheckCircle2 } from 'lucide-react'
import { CopyButton } from '@/components/shared/CopyButton'
import { Portal } from '@/components/shared/Portal'

interface KeyCreateModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function KeyCreateModal({ isOpen, onClose, onSuccess }: KeyCreateModalProps) {
    const [name, setName] = useState('')
    const [environment, setEnvironment] = useState<'live' | 'test'>('live')
    const [isLoading, setIsLoading] = useState(false)
    const [createdKey, setCreatedKey] = useState<string | null>(null)
    const [confirmedSaved, setConfirmedSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            // Direct fetch to backend since auth is maintained via standard session
            const res = await fetch('/api/v1/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name || 'Unnamed Key' })
            })

            const data = await res.json()
            if (!res.ok) {
                const message = data?.error?.message ?? data?.error ?? 'Failed to create key'
                throw new Error(message)
            }

            const { apiKey } = data
            setCreatedKey(apiKey)
            onSuccess()
        } catch (err: any) {
            console.error(err)
            setError(err.message ?? 'Failed to create key')
        } finally {
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        setCreatedKey(null)
        setName('')
        setEnvironment('live')
        setConfirmedSaved(false)
        setError(null)
        onClose()
    }

    return (
        <Portal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="absolute inset-0 bg-bg-void/80 backdrop-blur-sm transition-opacity"
                    onClick={createdKey ? undefined : handleClose}
                />

                <div className="relative bg-surface border border-border-bright rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-up">
                    {!createdKey ? (
                        <form onSubmit={handleCreate}>
                            <div className="p-6 border-b border-border-dim flex justify-between items-center">
                                <div>
                                    <h2 className="font-display font-medium text-lg text-text-primary flex items-center gap-2">
                                        <PlusSquare className="w-5 h-5 text-electric" />
                                        Create API Key
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="text-text-muted hover:text-text-primary transition-colors focus-visible:outline-electric"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Key Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Production Agent"
                                        className="w-full bg-transparent border-0 border-b border-border-dim px-0 py-2 text-text-primary focus:outline-none focus:border-electric transition-colors"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Environment</label>
                                    <div className="inline-flex rounded-full border border-border-dim p-1 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setEnvironment('live')}
                                            className={`px-3 py-1 text-xs rounded-full ${environment === 'live' ? 'bg-overlay border border-border-bright text-text-primary' : 'text-text-secondary'}`}
                                        >
                                            Live
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEnvironment('test')}
                                            className={`px-3 py-1 text-xs rounded-full ${environment === 'test' ? 'bg-overlay border border-border-bright text-text-primary' : 'text-text-secondary'}`}
                                        >
                                            Test
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="text-danger bg-danger-dim border border-danger/30 rounded-md px-3 py-2 text-sm">
                                        {error}
                                    </div>
                                )}
                                <p className="text-xs text-text-muted leading-relaxed">
                                    Remember: Treat your API keys like passwords. They control access to all your deals and commerce functionality.
                                </p>
                            </div>

                            <div className="p-4 border-t border-border-dim bg-overlay/30 flex justify-end gap-3">
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
                                    {isLoading ? 'Creating...' : 'Create Key'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div>
                            <div className="p-6 border-b border-border-dim flex items-center justify-between">
                                <h2 className="font-display font-medium text-lg text-positive flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                    API Key Generated
                                </h2>
                            </div>

                            <div className="p-6">
                                <div className="bg-warning-dim border border-warning/30 text-warning px-4 py-3 rounded-lg flex gap-3 text-sm leading-relaxed mb-6">
                                    <EyeOff className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div>
                                        <strong>Save this secret now.</strong> For your security, it will never be shown again. If you lose it, you will need to generate a new one.
                                    </div>
                                </div>

                                <div className="bg-elevated border border-border-bright rounded-lg p-3 flex items-center justify-between gap-4 mb-4 shadow-[0_0_15px_var(--electric-dim)]">
                                    <code className="text-electric font-mono text-sm break-all">
                                        {createdKey}
                                    </code>
                                    <CopyButton value={createdKey} size="md" className="shrink-0" />
                                </div>

                                <label className="flex items-start gap-2 text-xs text-text-secondary mb-2">
                                    <input
                                        type="checkbox"
                                        checked={confirmedSaved}
                                        onChange={(e) => setConfirmedSaved(e.target.checked)}
                                        className="mt-0.5"
                                    />
                                    I understand this key is shown once and I have saved it securely.
                                </label>
                            </div>

                            <div className="p-4 border-t border-border-dim bg-overlay/30">
                                <button
                                    onClick={handleClose}
                                    disabled={!confirmedSaved}
                                    className="w-full py-2.5 bg-electric text-black font-bold text-sm rounded-md hover:bg-white transition-colors disabled:opacity-50"
                                >
                                    I have saved my API key
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Portal>
    )
}

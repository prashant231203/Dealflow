'use client'

import { useState } from 'react'
import { Plus, Key, Clock, Trash2 } from 'lucide-react'
import { RelativeTime } from '@/components/shared/RelativeTime'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { KeyCreateModal } from '@/components/keys/KeyCreateModal'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export interface ApiKeyData {
    id: string
    name: string
    created_at: string
    last_used_at: string | null
    is_active: boolean
    hint: string
}

export function KeyMgmtClient({ initialKeys }: { initialKeys: ApiKeyData[] }) {
    const [keys, setKeys] = useState(initialKeys)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyData | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        if (searchParams.get('create') === '1') {
            setIsCreateModalOpen(true)
        }
    }, [searchParams])

    const handleRevoke = async () => {
        if (!keyToRevoke) return

        // In Dealflow we just delete the key for simplicity ("revoking")
        await supabase.from('api_keys').delete().eq('id', keyToRevoke.id)

        setKeys(prev => prev.filter(k => k.id !== keyToRevoke.id))
        setKeyToRevoke(null)
        router.refresh()
    }

    return (
        <>
            <div className="flex justify-end mb-6">
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-electric text-black font-bold font-display px-4 py-2 rounded-md hover:bg-white transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Create API Key
                </button>
            </div>

            {keys.length === 0 ? (
                <div className="bg-surface border border-border-default rounded-xl">
                    <EmptyState
                        icon={Key}
                        title="No API keys"
                        description="Create an API key to authenticate your SDK or direct HTTP requests to Dealflow."
                    />
                </div>
            ) : (
                <div className="bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border-dim bg-overlay/30 text-xs font-medium text-text-muted uppercase tracking-wider">
                                    <th className="py-3 px-4 font-normal">Name & Hint</th>
                                    <th className="py-3 px-4 font-normal">Status</th>
                                    <th className="py-3 px-4 font-normal">Created</th>
                                    <th className="py-3 px-4 font-normal">Last Used</th>
                                    <th className="py-3 px-4 font-normal text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dim">
                                {keys.map((k) => (
                                    <tr key={k.id} className="hover:bg-overlay transition-colors group">
                                        <td className="py-3 px-4">
                                            <div className="font-medium text-sm text-text-primary mb-0.5">{k.name}</div>
                                            <div className="font-mono text-xs text-text-muted">df_{k.hint}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${k.is_active ? 'bg-status-active/10 text-status-active border-status-active/20' : 'bg-status-closed/10 text-status-closed border-status-closed/20'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${k.is_active ? 'bg-status-active shadow-[0_0_6px_var(--status-active)] animate-pulse' : 'bg-status-closed'}`} />
                                                {k.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-text-secondary">
                                            {new Date(k.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-4 text-xs text-text-secondary">
                                            {k.last_used_at ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-text-muted" />
                                                    <RelativeTime timestamp={k.last_used_at} />
                                                </div>
                                            ) : (
                                                <span className="italic text-text-muted">Never</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => setKeyToRevoke(k)}
                                                className="text-xs font-medium text-text-muted hover:text-danger hover:bg-danger/10 transition-colors border border-transparent hover:border-danger/30 rounded px-3 py-1.5 focus-visible:outline-danger opacity-0 group-hover:opacity-100 flex items-center gap-1.5 ml-auto"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Revoke
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals */}
            <KeyCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    // Force hard refresh to grab the new key securely from the server
                    router.refresh()
                    // Optionally keep modal open until they click "I have saved it" which is handled internally
                }}
            />

            <ConfirmDialog
                isOpen={!!keyToRevoke}
                title="Revoke API Key"
                description={`Are you sure you want to revoke the key "${keyToRevoke?.name}" (df_${keyToRevoke?.hint})? Any agents using this key will immediately lose access.`}
                confirmLabel="Revoke Key"
                dangerous
                requiresTyping={`df_${keyToRevoke?.hint}`}
                onConfirm={handleRevoke}
                onCancel={() => setKeyToRevoke(null)}
            />
        </>
    )
}

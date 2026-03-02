'use client'

import { useState } from 'react'
import { Plus, Webhook, Trash2, ArrowRightCircle } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { WebhookCreateModal } from '@/components/webhooks/WebhookCreateModal'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export function WebhooksMgmtClient({ initialWebhooks }: { initialWebhooks: any[] }) {
    const [webhooks, setWebhooks] = useState(initialWebhooks)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [webhookToDelete, setWebhookToDelete] = useState<any>(null)
    const router = useRouter()

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleDelete = async () => {
        if (!webhookToDelete) return
        await supabase.from('webhooks').delete().eq('id', webhookToDelete.id)
        setWebhooks(prev => prev.filter(w => w.id !== webhookToDelete.id))
        setWebhookToDelete(null)
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
                    Add Endpoint
                </button>
            </div>

            {webhooks.length === 0 ? (
                <div className="bg-surface border border-border-default rounded-xl">
                    <EmptyState
                        icon={Webhook}
                        title="No webhooks configured"
                        description="Set up webhooks to receive real-time POST requests when your deals update."
                    />
                </div>
            ) : (
                <div className="bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border-dim bg-overlay/30 text-xs font-medium text-text-muted uppercase tracking-wider">
                                    <th className="py-3 px-4 font-normal w-1/2">Endpoint URL</th>
                                    <th className="py-3 px-4 font-normal text-center">Events</th>
                                    <th className="py-3 px-4 font-normal">Status</th>
                                    <th className="py-3 px-4 font-normal text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dim">
                                {webhooks.map((w) => (
                                    <tr key={w.id} className="hover:bg-overlay transition-colors group">
                                        <td className="py-3 px-4">
                                            <div className="font-mono text-sm text-text-primary mb-1 break-all">{w.url}</div>
                                            {w.description && <div className="text-xs text-text-muted">{w.description}</div>}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="inline-flex items-center justify-center bg-elevated border border-border-dim rounded-full px-2 py-0.5 text-xs text-text-secondary font-mono">
                                                {w.events.length} {w.events.length === 1 ? 'event' : 'events'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${w.is_active ? 'bg-status-active/10 text-status-active border-status-active/20' : 'bg-status-paused/10 text-status-paused border-status-paused/20'}`}>
                                                {w.is_active ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => setWebhookToDelete(w)}
                                                className="text-xs font-medium text-text-muted hover:text-danger hover:bg-danger/10 transition-colors border border-transparent hover:border-danger/30 rounded px-3 py-1.5 focus-visible:outline-danger opacity-0 group-hover:opacity-100 flex items-center gap-1.5 ml-auto"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <WebhookCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    router.refresh()
                }}
            />

            <ConfirmDialog
                isOpen={!!webhookToDelete}
                title="Remove Endpoint"
                description={`Are you sure you want to stop sending webhooks to ${webhookToDelete?.url}?`}
                confirmLabel="Remove"
                dangerous
                onConfirm={handleDelete}
                onCancel={() => setWebhookToDelete(null)}
            />
        </>
    )
}

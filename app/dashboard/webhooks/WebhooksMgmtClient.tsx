'use client'

import { useState } from 'react'
import { Plus, Webhook, Trash2, FlaskConical, ScrollText } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { WebhookCreateModal } from '@/components/webhooks/WebhookCreateModal'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { RelativeTime } from '@/components/shared/RelativeTime'

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {webhooks.map((w) => (
                        <div key={w.id} className="group rounded-xl border border-border-default bg-surface p-4 hover:border-border-bright">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="font-mono text-sm text-text-primary break-all">{w.url}</div>
                                    {w.description && <div className="mt-1 text-xs text-text-muted">{w.description}</div>}
                                </div>

                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    <button className="h-7 w-7 rounded-md border border-border-dim text-text-secondary hover:text-text-primary" title="Logs">
                                        <ScrollText className="w-3.5 h-3.5 mx-auto" />
                                    </button>
                                    <button className="h-7 w-7 rounded-md border border-border-dim text-text-secondary hover:text-text-primary" title="Test">
                                        <FlaskConical className="w-3.5 h-3.5 mx-auto" />
                                    </button>
                                    <button onClick={() => setWebhookToDelete(w)} className="h-7 w-7 rounded-md border border-danger/30 text-danger" title="Delete">
                                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {(w.events || []).map((event: string) => {
                                    const tone = event.includes('offer')
                                        ? 'bg-info/10 text-info border-info/30'
                                        : event.includes('compliance')
                                            ? 'bg-danger/10 text-danger border-danger/30'
                                            : 'bg-positive/10 text-positive border-positive/30'
                                    return (
                                        <span key={event} className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${tone}`}>
                                            {event}
                                        </span>
                                    )
                                })}
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-md border border-border-dim bg-elevated px-2 py-1.5 text-text-secondary">
                                    Last Triggered
                                    <div className="mt-1 text-text-primary font-mono">
                                        {w.last_triggered_at ? <RelativeTime timestamp={w.last_triggered_at} /> : 'Never'}
                                    </div>
                                </div>
                                <div className="rounded-md border border-border-dim bg-elevated px-2 py-1.5 text-text-secondary">
                                    Delivery Success
                                    <div className={`mt-1 font-mono ${w.successRate < 70 ? 'text-danger' : w.successRate < 90 ? 'text-warning' : 'text-positive'}`}>
                                        {w.successRate}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
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

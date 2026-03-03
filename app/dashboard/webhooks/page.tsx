import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { WebhooksMgmtClient } from '@/app/dashboard/webhooks/WebhooksMgmtClient'

export const dynamic = 'force-dynamic'

export default async function WebhooksPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Fetch webhooks
    const { data: webhooks } = await supabase
        .from('webhooks')
        .select('id, developer_id, url, events, is_active, description, created_at, last_triggered_at')
        .eq('developer_id', user.id)
        .order('created_at', { ascending: false })

    const webhookIds = (webhooks || []).map((w: any) => w.id)
    let deliveries: any[] = []

    if (webhookIds.length > 0) {
        const { data } = await supabase
            .from('webhook_deliveries')
            .select('webhook_id, succeeded')
            .in('webhook_id', webhookIds)
            .limit(500)
        deliveries = data || []
    }

    const statsMap = deliveries.reduce((acc: Record<string, { total: number; ok: number }>, row: any) => {
        const current = acc[row.webhook_id] || { total: 0, ok: 0 }
        current.total += 1
        if (row.succeeded) current.ok += 1
        acc[row.webhook_id] = current
        return acc
    }, {})

    const webhooksWithStats = (webhooks || []).map((w: any) => {
        const stats = statsMap[w.id] || { total: 0, ok: 0 }
        const successRate = stats.total > 0 ? Math.round((stats.ok / stats.total) * 100) : 100
        return {
            ...w,
            successRate,
        }
    })

    return (
        <div className="max-w-5xl mx-auto animate-fade-up space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-display text-2xl text-text-primary mb-1">Webhooks</h1>
                    <p className="text-text-secondary text-sm">Configure cryptographic POST endpoints for realtime Dealflow events.</p>
                </div>
            </div>

            <WebhooksMgmtClient initialWebhooks={webhooksWithStats} />
        </div>
    )
}

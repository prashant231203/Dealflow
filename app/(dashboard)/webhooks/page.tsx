import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { WebhooksMgmtClient } from './WebhooksMgmtClient'

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
        .select('*')
        .eq('developer_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="max-w-5xl mx-auto animate-fade-up space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-display text-2xl text-text-primary mb-1">Webhooks</h1>
                    <p className="text-text-secondary text-sm">Configure cryptographic POST endpoints for realtime Dealflow events.</p>
                </div>
            </div>

            <WebhooksMgmtClient initialWebhooks={webhooks || []} />
        </div>
    )
}

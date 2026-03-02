import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { KeyMgmtClient } from './KeyMgmtClient'

export const dynamic = 'force-dynamic'

export default async function ApiKeysPage() {
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

    // Fetch current keys
    const { data: keys } = await supabase
        .from('api_keys')
        .select('id, name, created_at, last_used_at, is_active, hint')
        .eq('developer_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="max-w-5xl mx-auto animate-fade-up space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-display text-2xl text-text-primary mb-1">API Keys</h1>
                    <p className="text-text-secondary text-sm">Manage access tokens for your agents and automation scripts.</p>
                </div>
            </div>

            <KeyMgmtClient initialKeys={keys || []} />
        </div>
    )
}

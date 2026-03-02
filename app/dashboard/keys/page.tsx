import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { KeyMgmtClient, type ApiKeyData } from './KeyMgmtClient'

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
    const { data: rawKeys } = await supabase
        .from('api_keys')
        .select('*')
        .eq('developer_id', user.id)
        .order('created_at', { ascending: false })

    const keys: ApiKeyData[] = (rawKeys || []).map((k: any) => {
        const hint = typeof k.hint === 'string'
            ? k.hint
            : (typeof k.key_prefix === 'string' ? k.key_prefix : 'unknown')

        const isActive = typeof k.is_active === 'boolean'
            ? k.is_active
            : !k.revoked_at

        return {
            id: k.id,
            name: k.name || 'Unnamed Key',
            created_at: k.created_at,
            last_used_at: k.last_used_at ?? null,
            is_active: isActive,
            hint,
        }
    })

    return (
        <div className="max-w-5xl mx-auto animate-fade-up space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-display text-2xl text-text-primary mb-1">API Keys</h1>
                    <p className="text-text-secondary text-sm">Manage access tokens for your agents and automation scripts.</p>
                </div>
            </div>

            <KeyMgmtClient initialKeys={keys} />
        </div>
    )
}

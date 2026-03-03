import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { parseJson, handleRouteError } from '@/lib/utils/http'
import { validateCreateDealRequest } from '@/lib/utils/validation'
import { createDealId } from '@/lib/deals/ids'
import { generateDealSummary } from '@/lib/intelligence/summary'
import { fireWebhooks } from '@/lib/webhooks/delivery'
import type { CreateDealRequest } from '@/types'

export const dynamic = 'force-dynamic'

async function getSupabaseFromCookies() {
    const cookieStore = await cookies()
    return createServerClient(
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
}

export async function POST(request: Request) {
    try {
        const supabase = await getSupabaseFromCookies()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await parseJson<CreateDealRequest>(request)
        validateCreateDealRequest(body)

        const dealId = createDealId()
        const now = new Date().toISOString()

        const metadata = typeof user.user_metadata === 'object' && user.user_metadata
            ? (user.user_metadata as Record<string, unknown>)
            : {}
        const fullName = typeof metadata.full_name === 'string' ? metadata.full_name : null

        const { error: developerError } = await supabase
            .from('developers')
            .upsert(
                [{
                    id: user.id,
                    email: user.email,
                    name: fullName,
                }],
                { onConflict: 'id' }
            )

        if (developerError) throw developerError

        const { data: deal, error: insertError } = await supabase
            .from('deals')
            .insert({
                id: dealId,
                developer_id: user.id,
                type: body.type,
                intent: body.intent,
                status: 'active',
                parties: body.parties ?? [],
                constraints: body.constraints ?? {},
                metadata: body.metadata ?? {},
                tags: body.tags ?? [],
                created_at: now,
                updated_at: now,
                expires_at: body.expires_in ? new Date(Date.now() + body.expires_in * 1000).toISOString() : null,
            })
            .select()
            .single()

        if (insertError) throw insertError

        const initialSummary = await generateDealSummary(deal, [], [], 'created', user.id)

        await Promise.all([
            supabase.from('deals').update({ current_summary: initialSummary }).eq('id', dealId),
            supabase.from('deal_events').insert({
                deal_id: dealId,
                action: 'created',
                actor: 'system',
                payload: body,
                summary_after: initialSummary,
                sequence_number: 0,
            }),
        ])

        fireWebhooks(user.id, dealId, 'deal.created', deal, ['deal.active'])

        return NextResponse.json({ deal: { ...deal, current_summary: initialSummary } }, { status: 201 })
    } catch (error) {
        return handleRouteError(error)
    }
}

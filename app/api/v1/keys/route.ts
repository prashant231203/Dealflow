import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { generateApiKey } from '@/lib/auth/api-keys'

export const dynamic = 'force-dynamic'

async function getUserSupabase() {
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
    },
  )
}

export async function GET() {
  const supabase = await getUserSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('developer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ keys: data ?? [] }, { status: 200 })
}

export async function POST(request: Request) {
  const supabase = await getUserSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const metadata = typeof user.user_metadata === 'object' && user.user_metadata ? user.user_metadata as Record<string, unknown> : {}
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

  if (developerError) {
    console.error('Failed to ensure developer row exists', developerError)
    return NextResponse.json({ error: developerError.message }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const rawName = typeof body?.name === 'string' ? body.name.trim() : ''
  const name = rawName.length > 0 ? rawName.slice(0, 100) : 'Unnamed Key'

  const created = generateApiKey(process.env.NODE_ENV === 'production' ? 'production' : 'development')

  const insertPayload = {
    developer_id: user.id,
    name,
    key_hash: created.keyHash,
    key_prefix: created.keyPrefix,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  }

  const { error } = await supabase.from('api_keys').insert(insertPayload)

  if (error) {
    console.error('Failed to insert api key', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ apiKey: created.plaintext }, { status: 201 })
}

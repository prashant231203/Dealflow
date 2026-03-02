import { hashApiKey } from './api-keys'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AuthenticatedContext {
  developer: {
    id: string
    email: string
    name?: string
    company?: string
    created_at: string
  }
}

export async function authenticateRequest(request: Request): Promise<AuthenticatedContext | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const rawToken = authHeader.slice('Bearer '.length).trim()
  if (!rawToken) {
    return null
  }

  const tokenHash = hashApiKey(rawToken)

  // Query Supabase for the API key
  const { data: apiKey, error: keyError } = await supabaseAdmin
    .from('api_keys')
    .select('*, developers(*)')
    .eq('key_hash', tokenHash)
    .is('revoked_at', null)
    .single()

  if (keyError || !apiKey) {
    return null
  }

  const developer = apiKey.developers
  if (!developer) {
    return null
  }

  // Update last_used_at timestamp
  await supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id)

  return {
    developer: {
      id: developer.id,
      email: developer.email,
      name: developer.name,
      company: developer.company,
      created_at: developer.created_at
    }
  }
}

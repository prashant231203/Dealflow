import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Legacy alias to support backward compatibility for generic callers
export function createServerSupabaseClient(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey)
}

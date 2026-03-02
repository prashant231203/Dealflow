import { createClient } from '@supabase/supabase-js'

export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Legacy alias to support backward compatibility for generic callers
export function createBrowserSupabaseClient(url: string, anonKey: string) {
  return createClient(url, anonKey)
}

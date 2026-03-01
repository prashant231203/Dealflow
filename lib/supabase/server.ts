export interface SupabaseLikeServerClient {
  readonly url: string
  readonly serviceRoleKey: string
}

export function createServerSupabaseClient(url: string, serviceRoleKey: string): SupabaseLikeServerClient {
  return { url, serviceRoleKey }
}

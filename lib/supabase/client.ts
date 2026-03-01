export interface SupabaseLikeClient {
  readonly url: string
  readonly anonKey: string
}

export function createBrowserSupabaseClient(url: string, anonKey: string): SupabaseLikeClient {
  return { url, anonKey }
}

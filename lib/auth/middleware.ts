import { hashApiKey } from './api-keys.js'
import { memoryStore } from '../store/in-memory.js'

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
  const apiKey = memoryStore.apiKeys.find((item) => item.key_hash === tokenHash && !item.revoked_at)
  if (!apiKey) {
    return null
  }

  const developer = memoryStore.developers.find((item) => item.id === apiKey.developer_id)
  if (!developer) {
    return null
  }

  apiKey.last_used_at = new Date().toISOString()
  return { developer }
}

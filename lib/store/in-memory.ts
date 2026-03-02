import { generateApiKey } from '../auth/api-keys.js'
import type {
  DealData,
  DealEvent,
  DealOffer,
  WebhookRecord,
  WebhookDeliveryRecord,
  WebhookRetryQueueRecord
} from '../../types/index.js'

export interface DeveloperRecord {
  id: string
  email: string
  name?: string
  company?: string
  created_at: string
}

export interface ApiKeyRecord {
  id: string
  developer_id: string
  key_hash: string
  key_prefix: string
  name: string
  environment: 'development' | 'production'
  last_used_at?: string
  created_at: string
  revoked_at?: string
}

export const memoryStore: {
  developers: DeveloperRecord[]
  apiKeys: ApiKeyRecord[]
  deals: DealData[]
  offers: DealOffer[]
  events: DealEvent[]
  webhooks: WebhookRecord[]
  webhook_deliveries: WebhookDeliveryRecord[]
  webhook_retry_queue: WebhookRetryQueueRecord[]
} = {
  developers: [],
  apiKeys: [],
  deals: [],
  offers: [],
  events: [],
  webhooks: [],
  webhook_deliveries: [],
  webhook_retry_queue: [],
}

let seededApiKey: string | null = null

export function seedMemoryStore(): { apiKey: string; developer: DeveloperRecord } {
  if (memoryStore.developers.length > 0 && seededApiKey) {
    return { apiKey: seededApiKey, developer: memoryStore.developers[0] }
  }

  const now = new Date().toISOString()
  const developer: DeveloperRecord = {
    id: 'dev_seed_1',
    email: 'seed@dealflow.dev',
    name: 'Seed Dev',
    company: 'Dealflow',
    created_at: now,
  }

  const created = generateApiKey('development')
  const key: ApiKeyRecord = {
    id: 'key_seed_1',
    developer_id: developer.id,
    key_hash: created.keyHash,
    key_prefix: created.keyPrefix,
    name: 'Seed Key',
    environment: 'development',
    created_at: now,
  }

  memoryStore.developers = [developer]
  memoryStore.apiKeys = [key]
  seededApiKey = created.plaintext

  return { apiKey: created.plaintext, developer }
}

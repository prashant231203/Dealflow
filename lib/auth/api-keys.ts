import { createHash, randomBytes } from 'node:crypto'

export interface CreatedApiKey {
  plaintext: string
  keyHash: string
  keyPrefix: string
}

export function generateApiKey(environment: 'development' | 'production'): CreatedApiKey {
  const prefix = environment === 'production' ? 'df_live_' : 'df_test_'
  const plaintext = `${prefix}${randomBytes(16).toString('hex')}`
  return {
    plaintext,
    keyHash: hashApiKey(plaintext),
    keyPrefix: plaintext.slice(0, 12),
  }
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

export function verifyApiKey(rawKey: string, keyHash: string): boolean {
  return hashApiKey(rawKey) === keyHash
}

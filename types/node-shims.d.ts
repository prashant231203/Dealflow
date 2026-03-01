declare module 'node:crypto' {
  export function createHash(algorithm: string): {
    update(data: string): { digest(encoding: 'hex'): string }
    digest(encoding: 'hex'): string
  }
  export function randomBytes(size: number): { toString(encoding: 'hex' | 'base64url'): string }
  export function randomUUID(): string
  export function createHmac(algorithm: string, key: string): {
    update(data: string): { digest(encoding: 'hex'): string }
    digest(encoding: 'hex'): string
  }
}

declare const process: {
  env: Record<string, string | undefined>
}

declare module 'groq-sdk' {
  export default class Groq {
    constructor(config: { apiKey: string })
    chat: {
      completions: {
        create(input: Record<string, unknown>): Promise<{
          choices: Array<{
            message?: {
              content?: string
            }
          }>
        }>
      }
    }
  }
}

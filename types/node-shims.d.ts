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

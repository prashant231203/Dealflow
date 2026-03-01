import { randomBytes } from 'node:crypto'

function token(length: number): string {
  return randomBytes(length).toString('base64url').slice(0, length)
}

export function createDealId(): string {
  return `deal_${token(10)}`
}

export function createOfferId(): string {
  return `off_${token(8)}`
}

export function createEventId(): string {
  return `evt_${token(12)}`
}

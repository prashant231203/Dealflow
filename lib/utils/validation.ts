import type {
  AcceptPayload,
  ActOnDealRequest,
  CreateDealRequest,
  RejectPayload,
} from '../../types/index.js'
import { ApiError } from './response.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function validateCreateDealRequest(input: CreateDealRequest): void {
  if (!input.intent || input.intent.trim().length === 0) {
    throw new ApiError('intent is required', 'VALIDATION_ERROR', 400)
  }

  if (!input.type) {
    throw new ApiError('type is required', 'VALIDATION_ERROR', 400)
  }

  if (input.expires_in !== undefined && (input.expires_in <= 0 || !Number.isFinite(input.expires_in))) {
    throw new ApiError('expires_in must be a positive number', 'VALIDATION_ERROR', 422)
  }
}

export function validateActOnDealRequest(input: ActOnDealRequest): void {
  if (!input.actor || input.actor.trim().length === 0) {
    throw new ApiError('actor is required', 'VALIDATION_ERROR', 400)
  }

  if (!input.action) {
    throw new ApiError('action is required', 'VALIDATION_ERROR', 400)
  }

  if (!isRecord(input.payload)) {
    throw new ApiError('payload must be an object', 'VALIDATION_ERROR', 422)
  }
}

export function parseAcceptPayload(payload: Record<string, unknown>): AcceptPayload {
  const offerId = payload.offer_id
  if (typeof offerId !== 'string' || offerId.length === 0) {
    throw new ApiError('offer_id is required for accept action', 'VALIDATION_ERROR', 422)
  }

  const notes = payload.notes
  if (notes !== undefined && typeof notes !== 'string') {
    throw new ApiError('notes must be a string', 'VALIDATION_ERROR', 422)
  }

  return { offer_id: offerId, notes: notes as string | undefined }
}

export function parseRejectPayload(payload: Record<string, unknown>): RejectPayload {
  const offerId = payload.offer_id
  if (typeof offerId !== 'string' || offerId.length === 0) {
    throw new ApiError('offer_id is required for reject action', 'VALIDATION_ERROR', 422)
  }

  const reason = payload.reason
  if (reason !== undefined && typeof reason !== 'string') {
    throw new ApiError('reason must be a string', 'VALIDATION_ERROR', 422)
  }

  return { offer_id: offerId, reason: reason as string | undefined }
}

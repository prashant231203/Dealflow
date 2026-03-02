import { ApiError } from './response'

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function errorResponse(error: string, code: string, status: number): Response {
  return json({ error, code, status }, status)
}

export function invalidApiKeyResponse(): Response {
  return errorResponse('Invalid or missing API key', 'INVALID_API_KEY', 401)
}

export function handleRouteError(error: unknown): Response {
  if (error instanceof ApiError) {
    return errorResponse(error.message, error.code, error.status)
  }

  if (error instanceof Error && error.message.includes('not allowed when deal status')) {
    return errorResponse(error.message, 'INVALID_TRANSITION', 400)
  }

  return errorResponse('Internal server error', 'SERVER_ERROR', 500)
}

export async function parseJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new ApiError('Invalid JSON body', 'VALIDATION_ERROR', 400)
  }
}

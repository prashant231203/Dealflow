export interface ApiSuccess<T> {
  status: number
  body: T
}

export interface ApiErrorBody {
  error: string
  code: string
  status: number
}

export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export function ok<T>(body: T, status = 200): ApiSuccess<T> {
  return { status, body }
}

export function fail(error: string, code: string, status: number): ApiSuccess<ApiErrorBody> {
  return { status, body: { error, code, status } }
}

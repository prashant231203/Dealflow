// ---------------------------------------------------------------------------
// @dealflow/sdk — Error Class
// ---------------------------------------------------------------------------

export class DealflowError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = 'DealflowError'
    this.code = code
    this.status = status

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, DealflowError.prototype)
  }

  /**
   * Create a DealflowError from an API error response body.
   */
  static fromResponse(body: { error?: string; message?: string; code?: string; status?: number }): DealflowError {
    return new DealflowError(
      body.error ?? body.message ?? 'Unknown API error',
      body.code ?? 'UNKNOWN_ERROR',
      body.status ?? 500,
    )
  }

  toString(): string {
    return `DealflowError [${this.code}] (${this.status}): ${this.message}`
  }
}

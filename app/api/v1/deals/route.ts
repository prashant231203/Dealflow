import { authenticateRequest } from '../../../../lib/auth/middleware.js'
import { createDeal as createDealDomain, listDeals as listDealsDomain } from './service.js'
import { generateDealSummary } from '../../../../lib/intelligence/summary.js'
import { errorResponse, handleRouteError, invalidApiKeyResponse, json, parseJson } from '../../../../lib/utils/http.js'
import { memoryStore } from '../../../../lib/store/in-memory.js'
import { ApiError } from '../../../../lib/utils/response.js'
import type { CreateDealRequest, DealFilters } from '../../../../types/index.js'
import { fireWebhooks } from '../../../../lib/webhooks/delivery.js'

function parseFilters(url: URL): DealFilters {
  const createdAfter = url.searchParams.get('created_after') ?? undefined
  const createdBefore = url.searchParams.get('created_before') ?? undefined

  if (createdAfter && Number.isNaN(Date.parse(createdAfter))) {
    throw new ApiError('created_after must be a valid ISO date string', 'VALIDATION_ERROR', 422)
  }

  if (createdBefore && Number.isNaN(Date.parse(createdBefore))) {
    throw new ApiError('created_before must be a valid ISO date string', 'VALIDATION_ERROR', 422)
  }

  return {
    status: (url.searchParams.get('status') as DealFilters['status']) ?? undefined,
    type: (url.searchParams.get('type') as DealFilters['type']) ?? undefined,
    current_handler: url.searchParams.get('current_handler') ?? undefined,
    tags: url.searchParams.get('tags') ?? undefined,
    created_after: createdAfter,
    created_before: createdBefore,
    search: url.searchParams.get('search') ?? undefined,
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request)
  if (!auth) return invalidApiKeyResponse()

  try {
    const body = await parseJson<CreateDealRequest>(request)
    const created = createDealDomain(body, auth.developer.id)
    const initialSummary = await generateDealSummary(created.deal, [], [], 'created', auth.developer.id)
    created.deal.current_summary = initialSummary
    memoryStore.deals.push(created.deal)

    // Fire webhooks asynchronously — do not await
    fireWebhooks(auth.developer.id, created.deal.id, 'deal.created', created.deal, ['deal.active'])

    return json(created, 201)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function GET(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request)
  if (!auth) return invalidApiKeyResponse()

  try {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const perPage = Number(url.searchParams.get('per_page') ?? '20')
    if (!Number.isInteger(page) || page < 1) {
      throw new ApiError('page must be an integer >= 1', 'VALIDATION_ERROR', 422)
    }
    if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) {
      throw new ApiError('per_page must be an integer between 1 and 100', 'VALIDATION_ERROR', 422)
    }
    const filters = parseFilters(url)

    const mine = memoryStore.deals.filter((deal) => deal.developer_id === auth.developer.id)
    const result = listDealsDomain(mine, filters, page, perPage)
    return json(result.body, result.status)
  } catch (error) {
    return handleRouteError(error)
  }
}

export function methodNotAllowed(): Response {
  return errorResponse('Method not allowed', 'VALIDATION_ERROR', 400)
}

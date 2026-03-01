import { authenticateRequest } from '../../../../lib/auth/middleware.js'
import { createDeal as createDealDomain, listDeals as listDealsDomain } from './service.js'
import { generateDealSummary } from '../../../../lib/intelligence/summary.js'
import { errorResponse, handleRouteError, invalidApiKeyResponse, json, parseJson } from '../../../../lib/utils/http.js'
import { memoryStore } from '../../../../lib/store/in-memory.js'
import type { CreateDealRequest, DealFilters } from '../../../../types/index.js'

function parseFilters(url: URL): DealFilters {
  return {
    status: (url.searchParams.get('status') as DealFilters['status']) ?? undefined,
    type: (url.searchParams.get('type') as DealFilters['type']) ?? undefined,
    current_handler: url.searchParams.get('current_handler') ?? undefined,
    tags: url.searchParams.get('tags') ?? undefined,
    created_after: url.searchParams.get('created_after') ?? undefined,
    created_before: url.searchParams.get('created_before') ?? undefined,
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

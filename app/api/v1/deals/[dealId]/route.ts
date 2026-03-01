import { authenticateRequest } from '../../../../../lib/auth/middleware.js'
import { invalidApiKeyResponse, json, handleRouteError, errorResponse } from '../../../../../lib/utils/http.js'
import { memoryStore } from '../../../../../lib/store/in-memory.js'

export async function GET(
  request: Request,
  context: { params: { dealId: string } },
): Promise<Response> {
  const auth = await authenticateRequest(request)
  if (!auth) return invalidApiKeyResponse()

  try {
    const deal = memoryStore.deals.find(
      (item) => item.id === context.params.dealId && item.developer_id === auth.developer.id,
    )

    if (!deal) return errorResponse('Deal not found', 'DEAL_NOT_FOUND', 404)

    const offers = memoryStore.offers.filter((item) => item.deal_id === deal.id)
    const history = memoryStore.events.filter((item) => item.deal_id === deal.id)
    return json({ deal: { ...deal, offers, history } })
  } catch (error) {
    return handleRouteError(error)
  }
}

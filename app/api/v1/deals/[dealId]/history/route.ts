import { authenticateRequest } from '../../../../../../lib/auth/middleware.js'
import { memoryStore } from '../../../../../../lib/store/in-memory.js'
import { errorResponse, invalidApiKeyResponse, json } from '../../../../../../lib/utils/http.js'

export async function GET(
  request: Request,
  context: { params: { dealId: string } },
): Promise<Response> {
  const auth = await authenticateRequest(request)
  if (!auth) return invalidApiKeyResponse()

  const deal = memoryStore.deals.find(
    (item) => item.id === context.params.dealId && item.developer_id === auth.developer.id,
  )
  if (!deal) return errorResponse('Deal not found', 'DEAL_NOT_FOUND', 404)

  const history = memoryStore.events
    .filter((item) => item.deal_id === deal.id)
    .sort((a, b) => a.sequence_number - b.sequence_number)

  return json({ history })
}

import { errorResponse, handleRouteError, json } from '../../../../lib/utils/http.js'
import { expireOffersJob } from '../../../../lib/jobs/expire-offers.js'

export async function GET(request: Request): Promise<Response> {
    const authHeader = request.headers.get('authorization')

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)
    }

    try {
        const count = await expireOffersJob()
        return json({ success: true, processed: count })
    } catch (error) {
        return handleRouteError(error)
    }
}

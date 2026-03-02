import { errorResponse, handleRouteError, json } from '../../../../lib/utils/http'
import { expireDealsJob } from '../../../../lib/jobs/expire-deals'

export async function GET(request: Request): Promise<Response> {
    const authHeader = request.headers.get('authorization')

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)
    }

    try {
        const count = await expireDealsJob()
        return json({ success: true, processed: count })
    } catch (error) {
        return handleRouteError(error)
    }
}

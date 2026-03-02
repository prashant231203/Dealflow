import type { ActOnDealRequest, DealEvent } from '../../types/index'

export interface CircuitBreakerResult {
    tripped: boolean
    reason: string | null
}

const CIRCUIT_LIMIT = 5
const CIRCUIT_TIME_WINDOW_MS = 60000

export function checkActionVelocity(recentEvents: DealEvent[], request: ActOnDealRequest): CircuitBreakerResult {
    // We only care about high-volume iterative actions
    if (request.action !== 'counter' && request.action !== 'offer') {
        return { tripped: false, reason: null }
    }

    // Optimize: we only need to look at the last 10 elements in memory (already sorted descending)
    // Assuming recentEvents[0] is the most recent
    const loopEvents = recentEvents.filter((e) => e.action === 'counter' || e.action === 'offer')

    if (loopEvents.length < CIRCUIT_LIMIT) {
        return { tripped: false, reason: null }
    }

    // Get the Nth recent iterative event
    const nthEvent = loopEvents[CIRCUIT_LIMIT - 1]
    const timeDiff = Date.now() - new Date(nthEvent.created_at).getTime()

    if (timeDiff <= CIRCUIT_TIME_WINDOW_MS) {
        return {
            tripped: true,
            reason: `Circuit Breaker Tripped: ${CIRCUIT_LIMIT} iterative offers executed within ${CIRCUIT_TIME_WINDOW_MS / 1000} seconds. High probability of infinite agentic loop.`
        }
    }

    return { tripped: false, reason: null }
}

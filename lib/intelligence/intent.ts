import { createClient } from '@supabase/supabase-js'
import type { DealAction, DealData, DealEvent } from '../../types/index'
import { ApiError } from '../utils/response'

const DISABLED_GROQ_KEYS = new Set(['', 'your_groq_api_key_here'])

function canUseGroq(): boolean {
    const key = process.env.GROQ_API_KEY ?? ''
    if (DISABLED_GROQ_KEYS.has(key.trim())) return false
    return true
}

const INTENT_SYSTEM_PROMPT = `You are a strict security validator for an M2M commerce engine.
Your job is to evaluate if a requested DealAction and payload semantically align with the Deal's original intent.
If the agent is attempting to "drift" the deal (e.g., the deal is for "buying GPUs" and the payload introduces "buying pizza"), you must REJECT it.
If the action logically serves the intent, you must ACCEPT it.

Respond ONLY with valid JSON in this exact structure:
{
  "is_valid": boolean,
  "reason": "short string explaining why it was accepted or rejected"
}`

export async function verifyActionIntent(
    deal: DealData,
    action: DealAction,
    payload: any,
    recentEvents: DealEvent[]
): Promise<void> {
    // If we don't have Groq, we assume valid to not break the system,
    // but in a true prod environment, we might strict-fail.
    if (!canUseGroq()) return

    try {
        const { groq } = await import('../groq/client')

        const recentActivity = recentEvents
            .sort((a, b) => a.sequence_number - b.sequence_number)
            .map(e => `[${e.action}] ${JSON.stringify(e.payload)}`)
            .join('\n')

        const userPrompt = `ORIGINAL INTENT: ${deal.intent}
DEAL TYPE: ${deal.type}

RECENT ACTIVITY:
${recentActivity || 'None'}

REQUESTED ACTION: ${action}
ACTION PAYLOAD: ${JSON.stringify(payload)}

Evaluate if this requested action semantically aligns with the original intent or if it represents an unauthorized topic drift.`

        const response = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system', content: INTENT_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 150,
            temperature: 0
        })

        const content = response.choices[0]?.message?.content
        if (!content) return

        const parsed = JSON.parse(content)
        if (parsed.is_valid === false) {
            throw new ApiError(
                `Intent Validation Failed: ${parsed.reason}`,
                'INTENT_DRIFT_DETECTED',
                400
            )
        }
    } catch (error) {
        if (error instanceof ApiError) throw error
        // If Groq fails or parsing fails, we log and proceed (fail-open)
        // To strictly enforce drift protection in V2, we would fail-closed.
        console.error('Intent validation error:', error)
    }
}

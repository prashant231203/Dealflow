import type { DealAction, DealData, DealEvent, DealOffer } from '../../types/index.js'

const DISABLED_GROQ_KEYS = new Set(['', 'your_groq_api_key_here'])
let groqClientAvailable: boolean | undefined
let groqWarningLogged = false

function canUseGroq(): boolean {
  if (groqClientAvailable === false) return false

  const key = process.env.GROQ_API_KEY ?? ''
  if (DISABLED_GROQ_KEYS.has(key.trim())) return false

  return true
}

function logGroqWarningOnce(message: string, error?: unknown): void {
  if (groqWarningLogged) return
  groqWarningLogged = true
  if (error) {
    console.warn(message, error)
    return
  }
  console.warn(message)
}

function buildFallback(deal: DealData, pendingOffers: DealOffer[]): string {
  return `${deal.type} deal for: ${deal.intent}. Status: ${deal.status}. ${pendingOffers.length} pending offer(s). ${deal.compliance_flags.length} compliance flag(s).`
}

function buildUserPrompt(
  deal: DealData,
  recentEvents: DealEvent[],
  pendingOffers: DealOffer[],
  lastAction?: DealAction,
  actor?: string,
): string {
  const constraints = deal.constraints
  const parties = deal.parties.length
    ? deal.parties.map((party) => `- ${party.id} as ${party.role} (${party.type})`).join('\n')
    : 'None'

  const offers = pendingOffers.length
    ? pendingOffers
        .map(
          (offer) =>
            `- Offer ${offer.id}: ${offer.price} ${offer.currency} by ${offer.made_by}. Within budget: ${offer.within_budget}. Quantity: ${offer.quantity ?? 'not specified'}. Conditions: ${(offer.conditions ?? []).join(', ') || 'none'}. Expires: ${offer.expires_at ?? 'no expiry'}.`,
        )
        .join('\n')
    : 'None'

  const flags = deal.compliance_flags.length
    ? deal.compliance_flags
        .map((flag) => `- ${flag.severity.toUpperCase()}: ${flag.message} (detected at ${flag.detected_at})`)
        .join('\n')
    : 'None'

  const activity = recentEvents.length
    ? [...recentEvents]
        .sort((a, b) => a.sequence_number - b.sequence_number)
        .map((event) => `[${event.created_at}] ${event.actor} took action '${event.action}': ${JSON.stringify(event.payload)}`)
        .join('\n')
    : 'No activity yet'

  return `DEAL ID: ${deal.id}
DEAL TYPE: ${deal.type}
INTENT: ${deal.intent}
CURRENT STATUS: ${deal.status}
CURRENT HANDLER: ${deal.current_handler ?? 'unassigned'}

CONSTRAINTS:
- Budget maximum: ${constraints.budget_max ?? 'not set'}
- Budget minimum / price floor: ${constraints.budget_min ?? 'not set'}
- Currency: ${constraints.currency ?? 'USD'}
- Deadline: ${constraints.deadline ?? 'no deadline'}
- Quantity needed: ${constraints.quantity ?? 'not specified'}
- Requirements: ${(constraints.requirements ?? []).join(', ') || 'none'}

PARTIES INVOLVED:
${parties}

PENDING OFFERS (${pendingOffers.length}):
${offers}

COMPLIANCE FLAGS (${deal.compliance_flags.length}):
${flags}

RECENT ACTIVITY (last ${recentEvents.length} events):
${activity}

JUST HAPPENED: ${lastAction ?? 'unknown'} by ${actor ?? 'unknown'}

DEAL CREATED: ${deal.created_at}
DEAL EXPIRES: ${deal.expires_at ?? 'no expiry'}`
}

const SYSTEM_PROMPT = `You are a commerce deal intelligence system. Your job is to write a concise briefing about the current state of a commerce deal for an AI agent that needs to immediately understand where things stand and what to do next.

Your briefing must always answer these questions in 2-4 sentences:
1. What is this deal trying to accomplish? (be specific — mention product, quantity, budget if present)
2. What is the current status and who currently has the deal?
3. Are there any open offers? If yes, mention the price and whether it is within budget.
4. Are there any compliance flags or policy violations? If yes, state them clearly.
5. What should happen next?

Rules:
- Always include specific numbers (prices, quantities, deadlines) when they are available.
- Never say "the deal is progressing" or other vague filler phrases.
- Never use bullet points, markdown, or formatting of any kind.
- Write as if briefing a new AI agent who has never seen this deal and must act on it immediately.
- If the deal is closed, state the outcome and final value clearly.
- Keep it under 4 sentences. Clarity over completeness.`

export async function generateDealSummary(
  deal: DealData,
  recentEvents: DealEvent[],
  pendingOffers: DealOffer[],
  lastAction?: DealAction,
  actor?: string,
): Promise<string> {
  const fallback = buildFallback(deal, pendingOffers)

  if (!canUseGroq()) {
    return fallback
  }

  try {
    const { groq } = await import('../groq/client.js')
    groqClientAvailable = true
    const userPrompt = buildUserPrompt(deal, recentEvents, pendingOffers, lastAction, actor)

    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_completion_tokens: 300,
      temperature: 1,
      top_p: 1,
      stream: false,
      stop: null,
      ...( { reasoning_effort: 'medium' } as Record<string, unknown> ),
    } as Record<string, unknown>)

    const summary = response.choices[0]?.message?.content
    if (!summary || (typeof summary === 'string' && summary.trim().length === 0)) {
      return fallback
    }

    return typeof summary === 'string' ? summary.trim() : fallback
  } catch (error) {
    const isMissingDependency =
      error instanceof Error && 'code' in error && (error as { code?: string }).code === 'ERR_MODULE_NOT_FOUND'

    if (isMissingDependency) {
      groqClientAvailable = false
      logGroqWarningOnce('Groq SDK is not installed. Falling back to deterministic deal summaries.')
      return fallback
    }

    console.error('Failed to generate deal summary with Groq:', error)
    return fallback
  }
}

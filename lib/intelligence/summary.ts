import type { DealAction, DealData, DealEvent, DealOffer } from '../../types/index'

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
      .map((event) => `[Event ID: ${event.id}] (${event.created_at}) ${event.actor} took action '${event.action}': ${JSON.stringify(event.payload)}`)
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

const SYSTEM_PROMPT = `You are a strict M2M commerce intelligence system. Your job is to produce a deterministic, machine-readable brief about the current state of a commerce deal.

You must output valid JSON ONLY, conforming exactly to this structure:
{
  "active_constraints": { "key": "value mappings of the constraints" },
  "verifiable_evidence_ids": ["string array of Event IDs cited as proof from the RECENT ACTIVITY list"],
  "suggested_next_action": {
    "action": "string indicating recommended next DealAction. Note: Must be a valid DealAction",
    "reason": "string explaining the mathematical or policy rationale"
  }
}

Rules:
- Output strictly JSON. Do not use markdown blocks.
- Do not add any explanatory text outside the JSON object.
- Make claims concise and objective.`

export async function generateDealSummary(
  deal: DealData,
  recentEvents: DealEvent[],
  pendingOffers: DealOffer[],
  lastAction?: DealAction,
  actor?: string,
): Promise<string> {
  const fallbackObj = {
    active_constraints: deal.constraints,
    verifiable_evidence_ids: recentEvents.map(e => e.id),
    suggested_next_action: { action: 'pause', reason: 'Deterministic fallback triggered' }
  }
  const fallback = JSON.stringify(fallbackObj)

  if (!canUseGroq()) {
    return fallback
  }

  try {
    const { groq } = await import('../groq/client')
    groqClientAvailable = true
    const userPrompt = buildUserPrompt(deal, recentEvents, pendingOffers, lastAction, actor)

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant', // using a fast JSON-capable model
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 400,
      temperature: 0,
    })

    const summary = response.choices[0]?.message?.content
    if (!summary || summary.trim().length === 0) {
      return fallback
    }

    try {
      // Validate it parses correctly
      const parsed = JSON.parse(summary)
      if (parsed.active_constraints && Array.isArray(parsed.verifiable_evidence_ids) && parsed.suggested_next_action) {
        return JSON.stringify(parsed)
      }
    } catch {
      // Parsing failed, return fallback
    }

    return fallback
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

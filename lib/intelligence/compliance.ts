import type { ComplianceFlag, DealAction, DealData, OfferPayload } from '../../types/index.js'

function asPositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

export function checkCompliance(deal: DealData, action: DealAction, payload: OfferPayload): ComplianceFlag[] {
  const flags: ComplianceFlag[] = []
  const now = new Date().toISOString()
  const currency = payload.currency ?? deal.constraints.currency ?? 'USD'

  if (deal.constraints.deadline && new Date(deal.constraints.deadline) < new Date()) {
    flags.push({
      type: 'deadline_missed',
      message: `This deal's deadline of ${deal.constraints.deadline} has already passed`,
      severity: 'warning',
      detected_at: now,
    })
  }

  if (action !== 'offer' && action !== 'counter') {
    return flags
  }

  const price = payload.price
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    return flags
  }

  const budgetMax = asPositiveNumber(deal.constraints.budget_max)
  if (budgetMax !== null && price > budgetMax) {
    flags.push({
      type: 'over_budget',
      message: `Offer of ${price} ${currency} exceeds the maximum budget of ${budgetMax} ${currency}`,
      severity: 'critical',
      detected_at: now,
    })
  }

  const budgetMin = asPositiveNumber(deal.constraints.budget_min)
  if (budgetMin !== null && price < budgetMin) {
    flags.push({
      type: 'price_floor_violated',
      message: `Offer of ${price} ${currency} is below the minimum price floor of ${budgetMin} ${currency}`,
      severity: 'critical',
      detected_at: now,
    })
  }

  if (budgetMax !== null && price >= budgetMax * 0.9 && price <= budgetMax) {
    flags.push({
      type: 'policy_violation',
      message: `Offer of ${price} ${currency} is within 10% of the budget ceiling (${budgetMax} ${currency}). Proceed carefully.`,
      severity: 'warning',
      detected_at: now,
    })
  }

  const required = deal.constraints.requirements ?? []
  if (required.length > 0) {
    const conditions = payload.conditions ?? []
    const missing = required.filter((item) => !conditions.includes(item))
    if (missing.length > 0) {
      flags.push({
        type: 'policy_violation',
        message: `Offer does not satisfy all required conditions. Missing: ${missing.join(', ')}`,
        severity: 'warning',
        detected_at: now,
      })
    }
  }

  return flags
}

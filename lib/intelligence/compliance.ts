import type { ComplianceFlag, DealAction, DealData, OfferPayload } from '../../types/index.js'

export function checkCompliance(deal: DealData, action: DealAction, payload: OfferPayload): ComplianceFlag[] {
  const flags: ComplianceFlag[] = []
  const now = new Date().toISOString()

  if (deal.expires_at && new Date(deal.expires_at) < new Date()) {
    flags.push({
      type: 'expired_deal',
      message: `Deal expired at ${deal.expires_at}`,
      severity: 'critical',
      detected_at: now,
    })
  }

  if (action !== 'offer' && action !== 'counter') return flags

  if (deal.constraints.budget_max && payload.price > deal.constraints.budget_max) {
    flags.push({
      type: 'over_budget',
      message: `Offer of ${payload.price} ${payload.currency ?? 'USD'} exceeds budget maximum of ${deal.constraints.budget_max}`,
      severity: 'critical',
      detected_at: now,
    })
  }

  if (deal.constraints.budget_max && payload.price > deal.constraints.budget_max * 0.9 && payload.price <= deal.constraints.budget_max) {
    flags.push({
      type: 'policy_violation',
      message: `Offer of ${payload.price} is within 10% of budget ceiling (${deal.constraints.budget_max})`,
      severity: 'warning',
      detected_at: now,
    })
  }

  if (deal.constraints.budget_min && payload.price < deal.constraints.budget_min) {
    flags.push({
      type: 'price_floor_violated',
      message: `Offer of ${payload.price} is below minimum price floor of ${deal.constraints.budget_min}`,
      severity: 'critical',
      detected_at: now,
    })
  }

  const required = deal.constraints.requirements ?? []
  if (required.length > 0) {
    const offerTerms = [...(payload.conditions ?? []), ...(payload.includes ?? [])]
    const missing = required.filter((item) => !offerTerms.includes(item))
    if (missing.length > 0) {
      flags.push({
        type: 'missing_requirements',
        message: `Offer is missing required terms: ${missing.join(', ')}`,
        severity: 'warning',
        detected_at: now,
      })
    }
  }

  return flags
}

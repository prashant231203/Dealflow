import type { DealConstraints, DealOffer, DealType } from '../../types/index'

export function computeBestOffer(
  dealId: string,
  constraints: DealConstraints,
  dealType: DealType,
  allOffers: DealOffer[]
): DealOffer | null {
  try {
    const pendingOffers = allOffers.filter((offer) => offer.deal_id === dealId && offer.status === 'pending')
    if (pendingOffers.length === 0) return null

    const filtered = pendingOffers.filter((offer) => {
      // Ensure constraints exist before checking
      if (!constraints) return true
      if (constraints.budget_max !== undefined && constraints.budget_max !== null && offer.price > constraints.budget_max) return false
      if (constraints.budget_min !== undefined && constraints.budget_min !== null && offer.price < constraints.budget_min) return false
      return true
    })

    if (filtered.length === 0) return null

    const sorted = [...filtered].sort((a, b) => {
      if (dealType === 'sales') return b.price - a.price
      if (dealType === 'return') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return a.price - b.price
    })

    return sorted[0] ?? null
  } catch (error) {
    console.error('Failed to compute best offer:', error)
    return null
  }
}

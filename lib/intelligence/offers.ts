import type { DealConstraints, DealOffer, DealType } from '../../types/index.js'

function isOfferValid(offer: DealOffer, constraints: DealConstraints): boolean {
  if (constraints.budget_max && offer.price > constraints.budget_max) return false
  if (constraints.budget_min && offer.price < constraints.budget_min) return false

  const required = constraints.requirements ?? []
  const present = [...(offer.conditions ?? []), ...(offer.includes ?? [])]
  return required.every((item) => present.includes(item))
}

export function computeBestOffer(offers: DealOffer[], constraints: DealConstraints, dealType: DealType): DealOffer | null {
  const pending = offers.filter((offer) => offer.status === 'pending').filter((offer) => isOfferValid(offer, constraints))

  if (pending.length === 0) return null

  const sorted = pending.sort((a, b) => (dealType === 'sales' ? b.price - a.price : a.price - b.price))
  return sorted[0] ?? null
}

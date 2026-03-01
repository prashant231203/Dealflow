import type { DealAction, DealData, DealEvent, DealOffer } from '../../types/index.js'

function offersSummary(offers: DealOffer[]): string {
  const pending = offers.filter((o) => o.status === 'pending')
  if (pending.length === 0) return 'No pending offers.'

  const rendered = pending
    .slice(0, 2)
    .map((offer) => `${offer.made_by} offered ${offer.price} ${offer.currency}`)
    .join('; ')

  return pending.length > 2 ? `${rendered}; plus ${pending.length - 2} more pending offers.` : `${rendered}.`
}

export async function generateDealSummary(
  deal: DealData,
  offers: DealOffer[],
  events: DealEvent[],
  lastAction?: DealAction,
): Promise<string> {
  const recentEvent = events.at(-1)
  const flagCount = deal.compliance_flags.length
  const statusPart = `Deal is ${deal.status}.`
  const intentPart = `Intent: ${deal.intent}.`
  const offersPart = offersSummary(offers)
  const flagsPart = flagCount > 0 ? `${flagCount} compliance flag(s) currently tracked.` : 'No compliance flags.'
  const nextPart = lastAction
    ? `Last action: ${lastAction} by ${recentEvent?.actor ?? 'unknown actor'}. Next step: review pending offers and decide accept/reject/escalate.`
    : 'Next step: begin negotiation with an opening offer or attach context notes.'

  return [intentPart, statusPart, offersPart, flagsPart, nextPart].join(' ')
}

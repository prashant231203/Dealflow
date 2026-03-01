# @dealflow/sdk

TypeScript-first Dealflow SDK.

## Core API

```ts
const deal = await client.deals.create({ type: 'negotiation', intent: 'Buy 10 units' })
await deal.offer({ actor: 'buyer-agent', price: 1000 })
```

# Dealflow

Dealflow is a developer SDK + hosted API that gives AI commerce agents persistent, intelligent, structured deal state.

This repository now includes:

- Shared type system (`types/index.ts`) used by API-domain and SDK code
- Auth-first API route handlers under `app/api/v1/deals/**` with Bearer key verification middleware
- Groq-backed summary generation in `lib/intelligence/summary.ts` (with deterministic fallback)
- Rule-based compliance and best-offer logic in `lib/intelligence/compliance.ts` and `lib/intelligence/offers.ts`
- API response/error helpers with consistent `{ error, code, status }` shape
- Supabase SQL migrations for schema, RLS policies, and performance indexes

## Environment

```bash
GROQ_API_KEY=your_groq_api_key_here
```

## Commands

```bash
npm run typecheck
npm test
npm run test:http
```

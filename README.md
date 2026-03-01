# Dealflow

Dealflow is a developer SDK + hosted API that gives AI commerce agents persistent, intelligent, structured deal state.

This repository now includes:

- Shared type system (`types/index.ts`) used by API-domain and SDK code
- SDK foundations in both `packages/sdk` and publishable `packages/@dealflow/sdk`
- Core deal domain logic in `lib/deals` and intelligence helpers in `lib/intelligence`
- API key generation/hashing helpers in `lib/auth/api-keys.ts`
- API response/error helpers with consistent `{ error, code, status }` shape
- Route-layer functions under `app/api/v1/deals/**`
- Supabase SQL migrations for schema, RLS policies, and performance indexes

## Commands

```bash
npm run typecheck
npm test
```

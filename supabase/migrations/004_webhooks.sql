-- supabase/migrations/004_webhooks.sql

-- 1. Create the webhooks table
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id UUID NOT NULL REFERENCES public.developers(id) ON DELETE CASCADE,
    url TEXT NOT NULL CHECK (
        url LIKE 'https://%' OR 
        url LIKE 'http://localhost%' OR 
        url LIKE 'http://127.0.0.1%' OR 
        url LIKE 'http://0.0.0.0%'
    ),
    events TEXT[] NOT NULL CHECK (array_length(events, 1) > 0),
    secret TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_triggered_at TIMESTAMPTZ
);

-- Index for querying by developer (common for listing APIs)
CREATE INDEX IF NOT EXISTS webhooks_developer_id_idx ON public.webhooks(developer_id);

-- 2. Create the webhook_deliveries table
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
    deal_id TEXT REFERENCES public.deals(id) ON DELETE SET NULL,
    event TEXT NOT NULL,
    payload JSONB NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    response_status INTEGER,
    response_body TEXT,
    duration_ms INTEGER,
    succeeded BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at TIMESTAMPTZ
);

-- Indexes for querying deliveries
CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_id_created_at_idx ON public.webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_deliveries_deal_id_idx ON public.webhook_deliveries(deal_id);

-- 3. Create the webhook_retry_queue table
CREATE TABLE IF NOT EXISTS public.webhook_retry_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
    deal_id TEXT REFERENCES public.deals(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    event TEXT NOT NULL,
    next_attempt_number INTEGER NOT NULL,
    retry_after TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_retry_queue_retry_after_idx ON public.webhook_retry_queue(retry_after);

-- 4. Setup RLS (Row Level Security)
-- Note: the application layer explicitly filters by developer_id, 
-- but we enable RLS to be safe in Supabase and write policies matching our auth patterns.

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_retry_queue ENABLE ROW LEVEL SECURITY;

-- Our application uses API keys instead of Supabase Auth, so backend routes operate via service role 
-- or bypass RLS explicitly. If any client-side queried them, they would need app-specific policies.
-- By default, tables with RLS enabled and no policies reject all access from the anon/authenticated roles.
-- This effectively ensures only the server (using service_role key) can read/write them.
-- Which perfectly aligns with our setup: explicit DB queries from our API routes using service role.

-- However, to be thorough (as the spec mentions allowing the developer to query their own webhooks if we were using RLS),
-- we write standard RLS policies, keeping in mind the actual auth is handled app-side.
CREATE POLICY "Developers can manage their own webhooks" ON public.webhooks
    FOR ALL
    USING (developer_id = auth.uid());

CREATE POLICY "Developers can view their own deliveries" ON public.webhook_deliveries
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.webhooks w WHERE w.id = webhook_deliveries.webhook_id AND w.developer_id = auth.uid()
    ));

-- webhook_retry_queue has no client-side reads or writes.

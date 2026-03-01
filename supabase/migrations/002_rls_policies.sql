ALTER TABLE developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY developers_self_access ON developers
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY api_keys_isolated ON api_keys
  USING (developer_id = auth.uid())
  WITH CHECK (developer_id = auth.uid());

CREATE POLICY deals_isolated ON deals
  USING (developer_id = auth.uid())
  WITH CHECK (developer_id = auth.uid());

CREATE POLICY events_isolated ON deal_events
  USING (deal_id IN (SELECT id FROM deals WHERE developer_id = auth.uid()))
  WITH CHECK (deal_id IN (SELECT id FROM deals WHERE developer_id = auth.uid()));

CREATE POLICY offers_isolated ON deal_offers
  USING (deal_id IN (SELECT id FROM deals WHERE developer_id = auth.uid()))
  WITH CHECK (deal_id IN (SELECT id FROM deals WHERE developer_id = auth.uid()));

CREATE POLICY webhooks_isolated ON webhooks
  USING (developer_id = auth.uid())
  WITH CHECK (developer_id = auth.uid());

CREATE POLICY webhook_deliveries_isolated ON webhook_deliveries
  USING (webhook_id IN (SELECT id FROM webhooks WHERE developer_id = auth.uid()))
  WITH CHECK (webhook_id IN (SELECT id FROM webhooks WHERE developer_id = auth.uid()));

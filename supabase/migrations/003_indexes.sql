CREATE INDEX idx_deals_developer_id ON deals(developer_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_developer_status ON deals(developer_id, status);
CREATE INDEX idx_deals_current_handler ON deals(current_handler);
CREATE INDEX idx_deal_events_deal_id ON deal_events(deal_id);
CREATE INDEX idx_deal_events_deal_sequence ON deal_events(deal_id, sequence_number);
CREATE INDEX idx_deal_offers_deal_id ON deal_offers(deal_id);
CREATE INDEX idx_deal_offers_deal_status ON deal_offers(deal_id, status);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

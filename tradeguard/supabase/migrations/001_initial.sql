-- TradeGuard Database Schema
-- Supabase (Postgres) migration

-- Trades table: every filled order
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webull_order_id TEXT UNIQUE,
  symbol TEXT NOT NULL,
  ticker TEXT NOT NULL,
  option_type TEXT NOT NULL CHECK (option_type IN ('call', 'put')),
  strike NUMERIC,
  expiry DATE,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity INTEGER NOT NULL,
  avg_price NUMERIC NOT NULL,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * avg_price * 100) STORED,
  filled_at TIMESTAMPTZ NOT NULL,
  placed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Round trips: matched buy/sell pairs
CREATE TABLE round_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  ticker TEXT NOT NULL,
  option_type TEXT NOT NULL CHECK (option_type IN ('call', 'put')),
  total_buy_cost NUMERIC NOT NULL,
  total_sell_revenue NUMERIC NOT NULL,
  pnl NUMERIC GENERATED ALWAYS AS (total_sell_revenue - total_buy_cost) STORED,
  pnl_pct NUMERIC,
  contracts INTEGER,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  hold_hours NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rule violations log
CREATE TABLE rule_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'hard_block')),
  message TEXT NOT NULL,
  trade_id UUID REFERENCES trades(id),
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI insights
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL CHECK (insight_type IN ('post_trade', 'weekly_review', 'on_demand')),
  content TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily stats (materialized for dashboard)
CREATE TABLE daily_stats (
  date DATE PRIMARY KEY,
  trades_count INTEGER,
  wins INTEGER,
  losses INTEGER,
  pnl NUMERIC,
  largest_loss NUMERIC,
  tickers_traded TEXT[],
  rules_violated TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rule configuration
CREATE TABLE rules_config (
  rule_id TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT TRUE,
  params JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default rule configurations
INSERT INTO rules_config (rule_id, enabled, params) VALUES
  ('nvda_call_block', TRUE, '{"blocked_tickers": ["NVDA"], "blocked_type": "call"}'),
  ('position_size_cap', TRUE, '{"max_size": 15000}'),
  ('expiry_week_hold', TRUE, '{"days_threshold": 3, "check_interval_minutes": 30}'),
  ('daily_loss_stop', TRUE, '{"max_losses": 2}'),
  ('weekly_ticker_limit', TRUE, '{"max_tickers": 4}'),
  ('single_loss_threshold', TRUE, '{"max_loss": 8000}');

-- Indexes for performance
CREATE INDEX idx_trades_ticker ON trades(ticker);
CREATE INDEX idx_trades_filled_at ON trades(filled_at);
CREATE INDEX idx_trades_side ON trades(side);
CREATE INDEX idx_trades_symbol_filled_side ON trades(symbol, filled_at, side);
CREATE INDEX idx_round_trips_ticker ON round_trips(ticker);
CREATE INDEX idx_round_trips_closed_at ON round_trips(closed_at);
CREATE INDEX idx_rule_violations_rule_id ON rule_violations(rule_id);
CREATE INDEX idx_rule_violations_created_at ON rule_violations(created_at);
CREATE INDEX idx_ai_insights_type ON ai_insights(insight_type);

-- Enable Supabase Realtime on trades and rule_violations
ALTER PUBLICATION supabase_realtime ADD TABLE trades;
ALTER PUBLICATION supabase_realtime ADD TABLE rule_violations;

# TradeGuard

Real-time options trading tracker and coaching app. Connects to Webull OpenAPI, tracks trades as they happen, enforces a rule engine on every fill, and provides AI-powered analysis via Claude.

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Python FastAPI
- **Database**: Supabase (Postgres + Realtime)
- **Real-time**: Webull OpenAPI (MQTT for order events)
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
- **State**: Zustand

## Setup

### 1. Database

Run the migration in Supabase:

```bash
# Copy contents of supabase/migrations/001_initial.sql into the Supabase SQL editor
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env
# Fill in your credentials in .env
uvicorn backend.main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Import Trades

Use the Settings page to upload a Webull CSV export, or:

```bash
curl -X POST http://localhost:8000/api/import/csv -F "file=@your_trades.csv"
```

## Environment Variables

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
WEBULL_APP_KEY=your_webull_app_key
WEBULL_APP_SECRET=your_webull_app_secret
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Rule Engine

Six rules fire on every fill event:

1. **NVDA Call Block** — hard blocks NVDA call purchases
2. **Position Size Cap** — blocks positions over $15K
3. **Expiry Week Hold** — warns on positions expiring within 3 days
4. **Daily 2-Loss Stop** — stops trading after 2 realized losses
5. **Weekly Ticker Limit** — warns on >4 unique tickers per week
6. **Single Loss Threshold** — warns on unrealized loss >$8K

All thresholds are configurable from the Settings page.

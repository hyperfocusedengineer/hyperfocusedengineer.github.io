"""
AI Coach — Claude API integration for trade analysis.

- Post-trade analysis after each round trip closes
- Weekly review (Sunday cron or manual trigger)
- On-demand chat with trading data context
"""

import anthropic
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from backend.config import ANTHROPIC_API_KEY
from backend.db import get_supabase

EDT = ZoneInfo("US/Eastern")
MODEL = "claude-sonnet-4-20250514"


def _get_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def _fmt_money(amount: float) -> str:
    return f"${amount:,.2f}"


async def post_trade_analysis(round_trip: dict) -> str:
    """Generate AI analysis after a round trip closes."""
    db = get_supabase()
    now = datetime.now(EDT)
    today = now.strftime("%Y-%m-%d")
    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")

    # Get today's P&L
    today_rts = db.table("round_trips").select("pnl").gte("closed_at", f"{today}T00:00:00").execute()
    daily_pnl = sum(float(r["pnl"]) for r in (today_rts.data or []))

    # Get this week's P&L
    week_rts = db.table("round_trips").select("pnl").gte("closed_at", f"{week_start}T00:00:00").execute()
    weekly_pnl = sum(float(r["pnl"]) for r in (week_rts.data or []))

    # Calculate streak
    recent_rts = db.table("round_trips").select("pnl").order("closed_at", desc=True).limit(20).execute()
    streak = 0
    if recent_rts.data:
        direction = "win" if float(recent_rts.data[0]["pnl"]) > 0 else "loss"
        for r in recent_rts.data:
            if (direction == "win" and float(r["pnl"]) > 0) or (direction == "loss" and float(r["pnl"]) < 0):
                streak += 1
            else:
                break
        streak = streak if direction == "win" else -streak

    pnl = float(round_trip.get("pnl", 0))
    pnl_pct = round_trip.get("pnl_pct", 0)
    hold_hours = round_trip.get("hold_hours", 0)
    buy_cost = float(round_trip.get("total_buy_cost", 0))

    prompt = f"""You are a trading coach analyzing an options trade.

Trader profile:
- 65.5% win rate, but inconsistent sizing causes large drawdowns
- Edge is strongest on puts and GOOG/AAPL calls
- Weakness: NVDA calls, holding through expiry, oversized positions

This trade just closed:
- Symbol: {round_trip['symbol']}
- Type: {round_trip['option_type']}
- P&L: {_fmt_money(pnl)} ({pnl_pct}%)
- Hold time: {hold_hours} hours
- Position size: {_fmt_money(buy_cost)}

Recent context:
- Today's P&L: {_fmt_money(daily_pnl)}
- This week's P&L: {_fmt_money(weekly_pnl)}
- Win streak / loss streak: {streak}

Give 2-3 sentences: what went right or wrong, and one specific actionable suggestion. Be direct, no sugar-coating. Reference the trader's known patterns."""

    client = _get_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.content[0].text

    # Store the insight
    db.table("ai_insights").insert({
        "insight_type": "post_trade",
        "content": content,
        "context": {
            "round_trip_id": round_trip.get("id"),
            "symbol": round_trip["symbol"],
            "pnl": pnl,
            "daily_pnl": daily_pnl,
            "weekly_pnl": weekly_pnl,
        },
    }).execute()

    return content


async def weekly_review() -> str:
    """Generate a weekly review of trading performance."""
    db = get_supabase()
    now = datetime.now(EDT)
    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%dT00:00:00")
    four_weeks_ago = (now - timedelta(weeks=4)).strftime("%Y-%m-%dT00:00:00")

    # This week's round trips
    week_rts = db.table("round_trips").select("*").gte("closed_at", week_start).execute()
    rts = week_rts.data or []

    count = len(rts)
    wins = len([r for r in rts if float(r.get("pnl", 0)) > 0])
    losses = count - wins
    weekly_pnl = sum(float(r.get("pnl", 0)) for r in rts)
    tickers = list(set(r["ticker"] for r in rts))

    # Largest win/loss
    if rts:
        sorted_by_pnl = sorted(rts, key=lambda r: float(r.get("pnl", 0)))
        largest_loss = sorted_by_pnl[0]
        largest_win = sorted_by_pnl[-1]
    else:
        largest_loss = largest_win = {"pnl": 0, "symbol": "N/A"}

    # Average position size and hold time
    avg_size = sum(float(r.get("total_buy_cost", 0)) for r in rts) / max(count, 1)
    avg_hold = sum(float(r.get("hold_hours", 0)) for r in rts) / max(count, 1)

    # Violations this week
    violations = db.table("rule_violations").select("rule_id").gte("created_at", week_start).execute()
    violation_ids = list(set(v["rule_id"] for v in (violations.data or [])))

    # Last 4 weeks P&L
    last_4_rts = db.table("round_trips").select("pnl, closed_at").gte("closed_at", four_weeks_ago).execute()
    weekly_pnls = {}
    for r in (last_4_rts.data or []):
        if r.get("closed_at"):
            week_num = datetime.fromisoformat(r["closed_at"]).isocalendar()[1]
            weekly_pnls[week_num] = weekly_pnls.get(week_num, 0) + float(r.get("pnl", 0))
    last_4_weeks = [f"${v:,.0f}" for v in list(weekly_pnls.values())[-4:]]

    # All-time stats
    all_rts = db.table("round_trips").select("pnl").execute()
    total_pnl = sum(float(r.get("pnl", 0)) for r in (all_rts.data or []))
    total_wins = len([r for r in (all_rts.data or []) if float(r.get("pnl", 0)) > 0])
    win_rate = (total_wins / max(len(all_rts.data or []), 1)) * 100

    prompt = f"""You are a trading coach doing a weekly review.

Weekly stats:
- Trades: {count}, Wins: {wins}, Losses: {losses}
- P&L: {_fmt_money(weekly_pnl)}
- Tickers: {', '.join(tickers)}
- Largest win: {_fmt_money(float(largest_win.get('pnl', 0)))} on {largest_win.get('symbol', 'N/A')}
- Largest loss: {_fmt_money(float(largest_loss.get('pnl', 0)))} on {largest_loss.get('symbol', 'N/A')}
- Rules violated: {', '.join(violation_ids) if violation_ids else 'None'}
- Avg position size: {_fmt_money(avg_size)}
- Avg hold time: {avg_hold:.1f}h

Historical context:
- Last 4 weeks P&L: {', '.join(last_4_weeks) if last_4_weeks else 'N/A'}
- Running total P&L: {_fmt_money(total_pnl)}
- Overall win rate: {win_rate:.1f}%

Provide:
1. One thing that worked well this week (be specific about which trade/pattern)
2. One thing that needs to change (be blunt)
3. Focus areas for next week (max 2, actionable)
4. Grade this week A-F with one-line justification

Keep it under 200 words. No fluff."""

    client = _get_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.content[0].text

    db.table("ai_insights").insert({
        "insight_type": "weekly_review",
        "content": content,
        "context": {
            "week_start": week_start,
            "trades_count": count,
            "pnl": weekly_pnl,
            "win_rate": win_rate,
        },
    }).execute()

    return content


async def chat(message: str) -> str:
    """On-demand chat about trader's data."""
    db = get_supabase()

    # Get last 30 days of trades for context
    thirty_days_ago = (datetime.now(EDT) - timedelta(days=30)).strftime("%Y-%m-%dT00:00:00")
    recent_trades = db.table("round_trips").select("*").gte("closed_at", thirty_days_ago).order("closed_at", desc=True).execute()
    trades_data = recent_trades.data or []

    # Summary stats
    total_pnl = sum(float(t.get("pnl", 0)) for t in trades_data)
    wins = len([t for t in trades_data if float(t.get("pnl", 0)) > 0])
    total = len(trades_data)
    win_rate = (wins / max(total, 1)) * 100

    by_ticker = {}
    for t in trades_data:
        tk = t["ticker"]
        if tk not in by_ticker:
            by_ticker[tk] = {"count": 0, "pnl": 0}
        by_ticker[tk]["count"] += 1
        by_ticker[tk]["pnl"] += float(t.get("pnl", 0))

    ticker_summary = "\n".join(
        f"  {tk}: {d['count']} trades, P&L: ${d['pnl']:,.2f}"
        for tk, d in sorted(by_ticker.items(), key=lambda x: x[1]["pnl"], reverse=True)
    )

    context = f"""Trading data context (last 30 days):
- Total trades: {total}
- Win rate: {win_rate:.1f}%
- Total P&L: ${total_pnl:,.2f}
- By ticker:
{ticker_summary}

Trader profile:
- 65.5% overall win rate
- Edge: puts and GOOG/AAPL calls
- Weakness: NVDA calls, holding through expiry, oversized positions

Recent round trips (last 10):
"""
    for t in trades_data[:10]:
        context += f"  {t['symbol']} | {t['option_type']} | P&L: ${float(t.get('pnl', 0)):,.2f} | Hold: {t.get('hold_hours', '?')}h | Size: ${float(t.get('total_buy_cost', 0)):,.2f}\n"

    client = _get_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=500,
        system=f"You are a trading coach with access to the trader's data. Be direct and data-driven. {context}",
        messages=[{"role": "user", "content": message}],
    )

    content = response.content[0].text

    db.table("ai_insights").insert({
        "insight_type": "on_demand",
        "content": content,
        "context": {"question": message},
    }).execute()

    return content

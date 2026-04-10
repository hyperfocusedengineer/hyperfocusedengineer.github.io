from fastapi import APIRouter, Query
from typing import Optional
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from backend.db import get_supabase

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
EDT = ZoneInfo("US/Eastern")


@router.get("/pnl-by-ticker")
async def pnl_by_ticker():
    db = get_supabase()
    result = db.table("round_trips").select("ticker, pnl").execute()
    by_ticker = {}
    for r in (result.data or []):
        tk = r["ticker"]
        if tk not in by_ticker:
            by_ticker[tk] = {"ticker": tk, "pnl": 0, "count": 0, "wins": 0, "losses": 0}
        pnl = float(r.get("pnl", 0))
        by_ticker[tk]["pnl"] += pnl
        by_ticker[tk]["count"] += 1
        if pnl > 0:
            by_ticker[tk]["wins"] += 1
        else:
            by_ticker[tk]["losses"] += 1
    return sorted(by_ticker.values(), key=lambda x: x["pnl"], reverse=True)


@router.get("/calls-vs-puts")
async def calls_vs_puts():
    db = get_supabase()
    result = db.table("round_trips").select("option_type, pnl").execute()
    stats = {"call": {"pnl": 0, "count": 0, "wins": 0}, "put": {"pnl": 0, "count": 0, "wins": 0}}
    for r in (result.data or []):
        ot = r["option_type"]
        pnl = float(r.get("pnl", 0))
        stats[ot]["pnl"] += pnl
        stats[ot]["count"] += 1
        if pnl > 0:
            stats[ot]["wins"] += 1
    return stats


@router.get("/win-rate-rolling")
async def win_rate_rolling(window: int = Query(default=20, le=100)):
    """Rolling win rate over N-trade windows."""
    db = get_supabase()
    result = db.table("round_trips").select("pnl, closed_at").order("closed_at").execute()
    trades = result.data or []

    rolling = []
    for i in range(window, len(trades) + 1):
        window_trades = trades[i - window:i]
        wins = sum(1 for t in window_trades if float(t.get("pnl", 0)) > 0)
        rolling.append({
            "trade_index": i,
            "date": window_trades[-1].get("closed_at", ""),
            "win_rate": round((wins / window) * 100, 1),
        })
    return rolling


@router.get("/size-vs-pnl")
async def size_vs_pnl():
    """Position size vs P&L scatter data."""
    db = get_supabase()
    result = db.table("round_trips").select("total_buy_cost, pnl, symbol, ticker").execute()
    return [
        {
            "size": float(r.get("total_buy_cost", 0)),
            "pnl": float(r.get("pnl", 0)),
            "symbol": r["symbol"],
            "ticker": r["ticker"],
        }
        for r in (result.data or [])
    ]


@router.get("/hold-time-distribution")
async def hold_time_distribution():
    """Distribution of hold times."""
    db = get_supabase()
    result = db.table("round_trips").select("hold_hours, pnl, symbol").execute()
    return [
        {
            "hold_hours": float(r.get("hold_hours", 0)),
            "pnl": float(r.get("pnl", 0)),
            "symbol": r["symbol"],
        }
        for r in (result.data or [])
    ]


@router.get("/hourly-performance")
async def hourly_performance():
    """P&L by hour of day."""
    db = get_supabase()
    result = db.table("round_trips").select("opened_at, pnl").execute()
    by_hour = {}
    for r in (result.data or []):
        if r.get("opened_at"):
            try:
                dt = datetime.fromisoformat(r["opened_at"])
                hour = dt.astimezone(EDT).hour
                if hour not in by_hour:
                    by_hour[hour] = {"hour": hour, "pnl": 0, "count": 0, "wins": 0}
                pnl = float(r.get("pnl", 0))
                by_hour[hour]["pnl"] += pnl
                by_hour[hour]["count"] += 1
                if pnl > 0:
                    by_hour[hour]["wins"] += 1
            except (ValueError, TypeError):
                continue
    return sorted(by_hour.values(), key=lambda x: x["hour"])


@router.get("/weekly-pnl")
async def weekly_pnl(weeks: int = Query(default=12, le=52)):
    """Weekly P&L for the last N weeks."""
    db = get_supabase()
    cutoff = (datetime.now(EDT) - timedelta(weeks=weeks)).strftime("%Y-%m-%dT00:00:00")
    result = db.table("round_trips").select("pnl, closed_at").gte("closed_at", cutoff).execute()

    by_week = {}
    for r in (result.data or []):
        if r.get("closed_at"):
            try:
                dt = datetime.fromisoformat(r["closed_at"])
                # Week start (Monday)
                week_start = (dt - timedelta(days=dt.weekday())).strftime("%Y-%m-%d")
                if week_start not in by_week:
                    by_week[week_start] = {"week": week_start, "pnl": 0, "trades": 0, "wins": 0}
                pnl = float(r.get("pnl", 0))
                by_week[week_start]["pnl"] += pnl
                by_week[week_start]["trades"] += 1
                if pnl > 0:
                    by_week[week_start]["wins"] += 1
            except (ValueError, TypeError):
                continue
    return sorted(by_week.values(), key=lambda x: x["week"])


@router.get("/daily-stats")
async def daily_stats(days: int = Query(default=30, le=365)):
    """Daily stats for the last N days."""
    db = get_supabase()
    cutoff = (datetime.now(EDT) - timedelta(days=days)).strftime("%Y-%m-%dT00:00:00")
    result = db.table("round_trips").select("pnl, closed_at, ticker").gte("closed_at", cutoff).execute()

    by_day = {}
    for r in (result.data or []):
        if r.get("closed_at"):
            try:
                dt = datetime.fromisoformat(r["closed_at"])
                day = dt.astimezone(EDT).strftime("%Y-%m-%d")
                if day not in by_day:
                    by_day[day] = {"date": day, "pnl": 0, "trades": 0, "wins": 0, "losses": 0, "tickers": set()}
                pnl = float(r.get("pnl", 0))
                by_day[day]["pnl"] += pnl
                by_day[day]["trades"] += 1
                by_day[day]["tickers"].add(r["ticker"])
                if pnl > 0:
                    by_day[day]["wins"] += 1
                else:
                    by_day[day]["losses"] += 1
            except (ValueError, TypeError):
                continue

    # Convert sets to lists for JSON serialization
    for d in by_day.values():
        d["tickers"] = sorted(d["tickers"])

    return sorted(by_day.values(), key=lambda x: x["date"])

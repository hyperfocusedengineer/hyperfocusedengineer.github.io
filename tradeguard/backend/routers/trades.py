from fastapi import APIRouter, Query
from typing import Optional
from backend.db import get_supabase

router = APIRouter(prefix="/api/trades", tags=["trades"])


@router.get("")
async def list_trades(
    ticker: Optional[str] = None,
    side: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
):
    db = get_supabase()
    query = db.table("trades").select("*").order("filled_at", desc=True)

    if ticker:
        query = query.eq("ticker", ticker)
    if side:
        query = query.eq("side", side)

    result = query.range(offset, offset + limit - 1).execute()
    return result.data


@router.get("/round-trips")
async def list_round_trips(
    ticker: Optional[str] = None,
    option_type: Optional[str] = None,
    result_filter: Optional[str] = Query(None, alias="result"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
):
    db = get_supabase()
    query = db.table("round_trips").select("*").order("closed_at", desc=True)

    if ticker:
        query = query.eq("ticker", ticker)
    if option_type:
        query = query.eq("option_type", option_type)
    if date_from:
        query = query.gte("closed_at", date_from)
    if date_to:
        query = query.lte("closed_at", date_to)

    result = query.range(offset, offset + limit - 1).execute()
    data = result.data or []

    if result_filter == "win":
        data = [r for r in data if float(r.get("pnl", 0)) > 0]
    elif result_filter == "loss":
        data = [r for r in data if float(r.get("pnl", 0)) < 0]

    return data


@router.get("/open-positions")
async def get_open_positions():
    """Get open positions (unmatched buys)."""
    db = get_supabase()

    # Get all buys and sells grouped by symbol
    buys = db.table("trades").select("*").eq("side", "buy").order("filled_at").execute()
    sells = db.table("trades").select("*").eq("side", "sell").order("filled_at").execute()

    buy_qty = {}
    sell_qty = {}

    for b in (buys.data or []):
        sym = b["symbol"]
        buy_qty[sym] = buy_qty.get(sym, 0) + b["quantity"]

    for s in (sells.data or []):
        sym = s["symbol"]
        sell_qty[sym] = sell_qty.get(sym, 0) + s["quantity"]

    open_positions = []
    for sym, bq in buy_qty.items():
        sq = sell_qty.get(sym, 0)
        remaining = bq - sq
        if remaining > 0:
            # Find the most recent buy for this symbol
            last_buy = next(
                (b for b in reversed(buys.data or []) if b["symbol"] == sym), None
            )
            if last_buy:
                open_positions.append({
                    "symbol": sym,
                    "ticker": last_buy["ticker"],
                    "option_type": last_buy["option_type"],
                    "strike": last_buy.get("strike"),
                    "expiry": last_buy.get("expiry"),
                    "quantity": remaining,
                    "avg_price": last_buy["avg_price"],
                    "total_cost": remaining * float(last_buy["avg_price"]) * 100,
                })

    return open_positions


@router.get("/today")
async def get_today_trades():
    """Get today's trades and P&L summary."""
    from datetime import datetime
    from zoneinfo import ZoneInfo

    edt = ZoneInfo("US/Eastern")
    today = datetime.now(edt).strftime("%Y-%m-%d")

    db = get_supabase()
    trades = (
        db.table("trades")
        .select("*")
        .gte("filled_at", f"{today}T00:00:00")
        .order("filled_at", desc=True)
        .execute()
    )

    round_trips = (
        db.table("round_trips")
        .select("*")
        .gte("closed_at", f"{today}T00:00:00")
        .execute()
    )

    rts = round_trips.data or []
    pnl = sum(float(r.get("pnl", 0)) for r in rts)
    wins = len([r for r in rts if float(r.get("pnl", 0)) > 0])
    losses = len(rts) - wins

    return {
        "trades": trades.data or [],
        "round_trips": rts,
        "summary": {
            "pnl": pnl,
            "trades_count": len(trades.data or []),
            "wins": wins,
            "losses": losses,
        },
    }

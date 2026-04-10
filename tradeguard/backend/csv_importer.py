"""
Webull CSV export parser and importer.

Parses the exact format from Webull CSV exports:
  NVDA260413C00182500,NVDA260413C00182500,Buy,Filled,261,261,@1.6700000000,1.6700000000,DAY,04/09/2026 10:33:46 EDT,04/09/2026 10:34:15 EDT

Symbol format: {TICKER}{YYMMDD}{C|P}{STRIKE_x1000}
  e.g. NVDA260413C00182500 → NVDA, 2026-04-13, Call, $182.50
"""

import re
import csv
import io
from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from backend.db import get_supabase
from backend.models import CSVImportResponse

EDT = ZoneInfo("US/Eastern")

# Matches: TICKER YYMMDD C/P STRIKE(8 digits, implied 3 decimal places)
SYMBOL_PATTERN = re.compile(
    r"^([A-Z]+)(\d{6})([CP])(\d{8})$"
)


def parse_option_symbol(symbol: str) -> dict | None:
    """Parse an OCC option symbol into components."""
    match = SYMBOL_PATTERN.match(symbol)
    if not match:
        return None
    ticker, date_str, cp, strike_raw = match.groups()
    yy, mm, dd = date_str[:2], date_str[2:4], date_str[4:6]
    expiry = f"20{yy}-{mm}-{dd}"
    strike = Decimal(strike_raw) / Decimal("1000")
    option_type = "call" if cp == "C" else "put"
    return {
        "ticker": ticker,
        "expiry": expiry,
        "option_type": option_type,
        "strike": float(strike),
    }


def parse_webull_datetime(dt_str: str) -> str | None:
    """Parse Webull datetime string like '04/09/2026 10:33:46 EDT' to ISO format."""
    if not dt_str or not dt_str.strip():
        return None
    dt_str = dt_str.strip()
    # Remove timezone abbreviation and parse as EDT
    cleaned = re.sub(r"\s+(EDT|EST|ET)$", "", dt_str)
    try:
        dt = datetime.strptime(cleaned, "%m/%d/%Y %H:%M:%S")
        dt = dt.replace(tzinfo=EDT)
        return dt.isoformat()
    except ValueError:
        return None


def parse_csv_content(content: str) -> list[dict]:
    """Parse CSV content and return list of trade dicts."""
    trades = []
    reader = csv.reader(io.StringIO(content))

    for row in reader:
        if len(row) < 11:
            continue

        symbol = row[0].strip()
        side_raw = row[2].strip()
        status = row[3].strip()
        quantity_str = row[4].strip()
        avg_price_str = row[7].strip()
        placed_time_str = row[9].strip()
        filled_time_str = row[10].strip()

        # Only import filled orders
        if status != "Filled":
            continue

        # Skip header rows
        if side_raw in ("Side", ""):
            continue

        side = side_raw.lower()
        if side not in ("buy", "sell"):
            continue

        parsed = parse_option_symbol(symbol)
        if not parsed:
            continue

        try:
            quantity = int(quantity_str)
        except ValueError:
            continue

        # Price may have @ prefix
        avg_price_str = avg_price_str.lstrip("@")
        try:
            avg_price = float(avg_price_str)
        except ValueError:
            continue

        filled_at = parse_webull_datetime(filled_time_str)
        placed_at = parse_webull_datetime(placed_time_str)

        if not filled_at:
            continue

        trades.append({
            "symbol": symbol,
            "ticker": parsed["ticker"],
            "option_type": parsed["option_type"],
            "strike": parsed["strike"],
            "expiry": parsed["expiry"],
            "side": side,
            "quantity": quantity,
            "avg_price": avg_price,
            "filled_at": filled_at,
            "placed_at": placed_at,
        })

    return trades


async def import_csv(content: str) -> CSVImportResponse:
    """Import CSV content into the trades table. Idempotent via symbol+filled_at+side."""
    trades = parse_csv_content(content)
    db = get_supabase()

    imported = 0
    skipped = 0
    errors = []

    for trade in trades:
        # Check for duplicates (symbol + filled_at + side)
        existing = (
            db.table("trades")
            .select("id")
            .eq("symbol", trade["symbol"])
            .eq("filled_at", trade["filled_at"])
            .eq("side", trade["side"])
            .execute()
        )

        if existing.data:
            skipped += 1
            continue

        try:
            db.table("trades").insert(trade).execute()
            imported += 1
        except Exception as e:
            errors.append(f"Failed to insert {trade['symbol']}: {str(e)}")

    # After import, rebuild round trips
    if imported > 0:
        await rebuild_round_trips()

    return CSVImportResponse(imported=imported, skipped=skipped, errors=errors)


async def rebuild_round_trips():
    """Match buy/sell trades into round trips using FIFO matching."""
    db = get_supabase()

    # Clear existing round trips
    db.table("round_trips").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    # Get all trades sorted by filled_at
    result = db.table("trades").select("*").order("filled_at").execute()
    trades = result.data

    # Group by symbol
    by_symbol: dict[str, list[dict]] = {}
    for t in trades:
        sym = t["symbol"]
        if sym not in by_symbol:
            by_symbol[sym] = []
        by_symbol[sym].append(t)

    # FIFO match buys to sells
    for symbol, symbol_trades in by_symbol.items():
        buys = [t for t in symbol_trades if t["side"] == "buy"]
        sells = [t for t in symbol_trades if t["side"] == "sell"]

        buy_idx = 0
        sell_idx = 0
        buy_remaining = 0

        while buy_idx < len(buys) and sell_idx < len(sells):
            buy = buys[buy_idx]
            sell = sells[sell_idx]

            if buy_remaining == 0:
                buy_remaining = buy["quantity"]

            sell_remaining = sell["quantity"]
            matched_qty = min(buy_remaining, sell_remaining)

            buy_cost = matched_qty * float(buy["avg_price"]) * 100
            sell_revenue = matched_qty * float(sell["avg_price"]) * 100
            pnl = sell_revenue - buy_cost
            pnl_pct = (pnl / buy_cost * 100) if buy_cost > 0 else 0

            opened = buy["filled_at"]
            closed = sell["filled_at"]

            # Calculate hold hours
            from dateutil import parser as dt_parser
            opened_dt = dt_parser.isoparse(opened)
            closed_dt = dt_parser.isoparse(closed)
            hold_hours = round((closed_dt - opened_dt).total_seconds() / 3600, 2)

            parsed = parse_option_symbol(symbol)
            ticker = parsed["ticker"] if parsed else symbol[:4]
            option_type = parsed["option_type"] if parsed else "call"

            db.table("round_trips").insert({
                "symbol": symbol,
                "ticker": ticker,
                "option_type": option_type,
                "total_buy_cost": round(buy_cost, 2),
                "total_sell_revenue": round(sell_revenue, 2),
                "pnl_pct": round(pnl_pct, 2),
                "contracts": matched_qty,
                "opened_at": opened,
                "closed_at": closed,
                "hold_hours": hold_hours,
            }).execute()

            buy_remaining -= matched_qty
            sell_remaining -= matched_qty

            if buy_remaining == 0:
                buy_idx += 1
            if sell_remaining == 0:
                sell_idx += 1

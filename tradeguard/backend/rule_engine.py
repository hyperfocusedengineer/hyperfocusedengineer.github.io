"""
TradeGuard Rule Engine — fires on every fill event.

6 rules, each returning RuleResult { triggered, severity, message, rule_id }.
Rules are configurable via the rules_config table.
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from backend.db import get_supabase
from backend.models import RuleResult

EDT = ZoneInfo("US/Eastern")


def _get_rule_config(rule_id: str) -> dict | None:
    db = get_supabase()
    result = db.table("rules_config").select("*").eq("rule_id", rule_id).execute()
    if result.data:
        return result.data[0]
    return None


def _fmt_money(amount: float) -> str:
    return f"${amount:,.0f}"


# --- Rule 1: NVDA Call Block ---

def check_nvda_call_block(trade: dict) -> RuleResult:
    config = _get_rule_config("nvda_call_block")
    if not config or not config["enabled"]:
        return RuleResult(triggered=False, severity="hard_block", message="", rule_id="nvda_call_block")

    params = config["params"]
    blocked_tickers = params.get("blocked_tickers", ["NVDA"])
    blocked_type = params.get("blocked_type", "call")

    if (
        trade["ticker"] in blocked_tickers
        and trade["option_type"] == blocked_type
        and trade["side"] == "buy"
    ):
        return RuleResult(
            triggered=True,
            severity="hard_block",
            message=f"BLOCKED: {trade['ticker']} {blocked_type}s are negative EV for you. "
                    f"You've lost $5.5K on 17 NVDA call trades. Your edge is in puts.",
            rule_id="nvda_call_block",
        )

    return RuleResult(triggered=False, severity="hard_block", message="", rule_id="nvda_call_block")


# --- Rule 2: Position Size Cap ---

def check_position_size_cap(trade: dict) -> RuleResult:
    config = _get_rule_config("position_size_cap")
    if not config or not config["enabled"]:
        return RuleResult(triggered=False, severity="hard_block", message="", rule_id="position_size_cap")

    max_size = config["params"].get("max_size", 15000)
    position_cost = trade["quantity"] * float(trade["avg_price"]) * 100

    if trade["side"] == "buy" and position_cost > max_size:
        return RuleResult(
            triggered=True,
            severity="hard_block",
            message=f"BLOCKED: Position size {_fmt_money(position_cost)} exceeds "
                    f"{_fmt_money(max_size)} cap. Your worst losses come from oversized positions.",
            rule_id="position_size_cap",
        )

    return RuleResult(triggered=False, severity="hard_block", message="", rule_id="position_size_cap")


# --- Rule 3: Expiry Week Hold Warning ---

def check_expiry_week_hold(open_positions: list[dict]) -> list[RuleResult]:
    """Check all open positions for upcoming expiry. Called periodically."""
    config = _get_rule_config("expiry_week_hold")
    if not config or not config["enabled"]:
        return []

    days_threshold = config["params"].get("days_threshold", 3)
    now = datetime.now(EDT).date()
    results = []

    for pos in open_positions:
        expiry = pos.get("expiry")
        if not expiry:
            continue
        if isinstance(expiry, str):
            from datetime import date
            expiry = date.fromisoformat(expiry)

        days_until = (expiry - now).days
        if 0 <= days_until <= days_threshold:
            results.append(RuleResult(
                triggered=True,
                severity="warning",
                message=f"WARNING: {pos['symbol']} expires in {days_until} day{'s' if days_until != 1 else ''}. "
                        f"Close or roll. Your two worst trades lost $46K holding through expiry.",
                rule_id="expiry_week_hold",
            ))

    return results


# --- Rule 4: Daily 2-Loss Stop ---

def check_daily_loss_stop(trade: dict) -> RuleResult:
    config = _get_rule_config("daily_loss_stop")
    if not config or not config["enabled"]:
        return RuleResult(triggered=False, severity="hard_block", message="", rule_id="daily_loss_stop")

    max_losses = config["params"].get("max_losses", 2)

    if trade["side"] != "buy":
        return RuleResult(triggered=False, severity="hard_block", message="", rule_id="daily_loss_stop")

    db = get_supabase()
    today = datetime.now(EDT).strftime("%Y-%m-%d")
    today_start = f"{today}T00:00:00-04:00"
    today_end = f"{today}T23:59:59-04:00"

    # Count realized losses today from round_trips
    result = (
        db.table("round_trips")
        .select("pnl")
        .gte("closed_at", today_start)
        .lte("closed_at", today_end)
        .execute()
    )

    losses = [r for r in (result.data or []) if float(r.get("pnl", 0)) < 0]
    total_loss = sum(float(r["pnl"]) for r in losses)

    if len(losses) >= max_losses:
        return RuleResult(
            triggered=True,
            severity="hard_block",
            message=f"STOPPED: {len(losses)} losses today ({_fmt_money(abs(total_loss))}). "
                    f"No more trades. This prevents tilt-trading.",
            rule_id="daily_loss_stop",
        )

    return RuleResult(triggered=False, severity="hard_block", message="", rule_id="daily_loss_stop")


# --- Rule 5: Weekly Ticker Limit ---

def check_weekly_ticker_limit(trade: dict) -> RuleResult:
    config = _get_rule_config("weekly_ticker_limit")
    if not config or not config["enabled"]:
        return RuleResult(triggered=False, severity="warning", message="", rule_id="weekly_ticker_limit")

    max_tickers = config["params"].get("max_tickers", 4)
    db = get_supabase()

    # Get start of current week (Monday)
    now = datetime.now(EDT)
    monday = now - timedelta(days=now.weekday())
    week_start = monday.strftime("%Y-%m-%dT00:00:00-04:00")

    result = (
        db.table("trades")
        .select("ticker")
        .gte("filled_at", week_start)
        .execute()
    )

    tickers_this_week = list(set(r["ticker"] for r in (result.data or [])))

    if (
        len(tickers_this_week) >= max_tickers
        and trade["ticker"] not in tickers_this_week
    ):
        return RuleResult(
            triggered=True,
            severity="warning",
            message=f"WARNING: Already traded {len(tickers_this_week)} tickers this week "
                    f"({', '.join(sorted(tickers_this_week))}). Focus beats spray.",
            rule_id="weekly_ticker_limit",
        )

    return RuleResult(triggered=False, severity="warning", message="", rule_id="weekly_ticker_limit")


# --- Rule 6: Single Loss Threshold ---

def check_single_loss_threshold(open_positions: list[dict]) -> list[RuleResult]:
    """Check open positions for unrealized loss exceeding threshold."""
    config = _get_rule_config("single_loss_threshold")
    if not config or not config["enabled"]:
        return []

    max_loss = config["params"].get("max_loss", 8000)
    results = []

    for pos in open_positions:
        unrealized_loss = float(pos.get("unrealized_pnl", 0))
        if unrealized_loss < -max_loss:
            results.append(RuleResult(
                triggered=True,
                severity="warning",
                message=f"WARNING: {pos['symbol']} is down {_fmt_money(abs(unrealized_loss))}. "
                        f"Approaching max single-loss threshold of {_fmt_money(max_loss)}.",
                rule_id="single_loss_threshold",
            ))

    return results


# --- Rule Runner ---

def run_fill_rules(trade: dict) -> list[RuleResult]:
    """Run all fill-triggered rules against a trade. Returns list of triggered rules."""
    results = []

    for check_fn in [check_nvda_call_block, check_position_size_cap, check_daily_loss_stop, check_weekly_ticker_limit]:
        result = check_fn(trade)
        if result.triggered:
            results.append(result)

    return results


def run_position_rules(open_positions: list[dict]) -> list[RuleResult]:
    """Run position-monitoring rules. Called periodically."""
    results = []
    results.extend(check_expiry_week_hold(open_positions))
    results.extend(check_single_loss_threshold(open_positions))
    return results


def log_violations(results: list[RuleResult], trade_id: str | None = None):
    """Persist rule violations to the database."""
    if not results:
        return
    db = get_supabase()
    for r in results:
        db.table("rule_violations").insert({
            "rule_id": r.rule_id,
            "severity": r.severity,
            "message": r.message,
            "trade_id": trade_id,
        }).execute()

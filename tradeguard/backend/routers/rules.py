from fastapi import APIRouter
from backend.db import get_supabase
from backend.models import RuleConfigUpdate
from backend.rule_engine import run_position_rules, log_violations

router = APIRouter(prefix="/api/rules", tags=["rules"])


@router.get("/config")
async def list_rules_config():
    db = get_supabase()
    result = db.table("rules_config").select("*").execute()
    return result.data


@router.put("/config/{rule_id}")
async def update_rule_config(rule_id: str, update: RuleConfigUpdate):
    db = get_supabase()
    data = {}
    if update.enabled is not None:
        data["enabled"] = update.enabled
    if update.params is not None:
        data["params"] = update.params
    if not data:
        return {"error": "No fields to update"}

    result = db.table("rules_config").update(data).eq("rule_id", rule_id).execute()
    return result.data[0] if result.data else {"error": "Rule not found"}


@router.get("/violations")
async def list_violations(limit: int = 50):
    db = get_supabase()
    result = (
        db.table("rule_violations")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


@router.post("/violations/{violation_id}/acknowledge")
async def acknowledge_violation(violation_id: str):
    db = get_supabase()
    result = (
        db.table("rule_violations")
        .update({"acknowledged": True})
        .eq("id", violation_id)
        .execute()
    )
    return result.data[0] if result.data else {"error": "Violation not found"}


@router.post("/check-positions")
async def check_positions():
    """Manually trigger position-based rule checks."""
    from backend.routers.trades import get_open_positions

    positions = await get_open_positions()
    results = run_position_rules(positions)
    if results:
        log_violations(results)
    return [r.model_dump() for r in results]


@router.get("/status")
async def rules_status():
    """Get current status of all rules (for dashboard panel)."""
    db = get_supabase()

    configs = db.table("rules_config").select("*").execute()
    recent_violations = (
        db.table("rule_violations")
        .select("rule_id, severity, created_at")
        .eq("acknowledged", False)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    # Group unacknowledged violations by rule
    violations_by_rule = {}
    for v in (recent_violations.data or []):
        rid = v["rule_id"]
        if rid not in violations_by_rule:
            violations_by_rule[rid] = []
        violations_by_rule[rid].append(v)

    statuses = []
    for config in (configs.data or []):
        rid = config["rule_id"]
        active_violations = violations_by_rule.get(rid, [])
        statuses.append({
            "rule_id": rid,
            "enabled": config["enabled"],
            "params": config["params"],
            "status": "triggered" if active_violations else "clear",
            "active_violations": len(active_violations),
            "last_triggered": active_violations[0]["created_at"] if active_violations else None,
        })

    return statuses

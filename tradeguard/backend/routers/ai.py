from fastapi import APIRouter
from backend.db import get_supabase
from backend.models import AiChatRequest
from backend.ai_coach import post_trade_analysis, weekly_review, chat

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/insights")
async def list_insights(insight_type: str | None = None, limit: int = 20):
    db = get_supabase()
    query = db.table("ai_insights").select("*").order("created_at", desc=True).limit(limit)
    if insight_type:
        query = query.eq("insight_type", insight_type)
    result = query.execute()
    return result.data


@router.post("/weekly-review")
async def trigger_weekly_review():
    """Manually trigger a weekly review."""
    content = await weekly_review()
    return {"content": content}


@router.post("/chat")
async def ai_chat(request: AiChatRequest):
    """On-demand chat with AI coach."""
    content = await chat(request.message)
    return {"content": content}


@router.post("/analyze-trade/{round_trip_id}")
async def analyze_trade(round_trip_id: str):
    """Trigger AI analysis for a specific round trip."""
    db = get_supabase()
    result = db.table("round_trips").select("*").eq("id", round_trip_id).execute()
    if not result.data:
        return {"error": "Round trip not found"}

    content = await post_trade_analysis(result.data[0])
    return {"content": content}

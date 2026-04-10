"""
TradeGuard — FastAPI Backend

Real-time options trading tracker, rule engine, and AI coaching.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import trades, analytics, rules, import_, ai
from backend.webull_client import connect_mqtt, is_configured, register_fill_callback
from backend.rule_engine import run_fill_rules, log_violations
from backend.db import get_supabase

logger = logging.getLogger(__name__)


def on_fill(trade: dict):
    """Callback fired on every Webull fill event."""
    db = get_supabase()

    # Write trade to database
    result = db.table("trades").insert(trade).execute()
    trade_id = result.data[0]["id"] if result.data else None

    # Run rule engine
    violations = run_fill_rules(trade)
    if violations:
        log_violations(violations, trade_id)
        for v in violations:
            logger.warning(f"Rule triggered: {v.rule_id} — {v.message}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("TradeGuard starting up")

    # Register fill callback for Webull events
    register_fill_callback(on_fill)

    # Start Webull MQTT in background if configured
    mqtt_task = None
    if is_configured():
        mqtt_task = asyncio.create_task(connect_mqtt())
        logger.info("Webull MQTT connection started")

    yield

    # Shutdown
    if mqtt_task:
        mqtt_task.cancel()
    logger.info("TradeGuard shutting down")


app = FastAPI(
    title="TradeGuard",
    description="Real-time options trading tracker and coaching app",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(trades.router)
app.include_router(analytics.router)
app.include_router(rules.router)
app.include_router(import_.router)
app.include_router(ai.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "tradeguard"}

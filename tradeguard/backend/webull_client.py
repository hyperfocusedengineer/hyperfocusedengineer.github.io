"""
Webull OpenAPI client — MQTT for order events, HTTP for account/positions.

Requires Webull developer API credentials (app_key, app_secret).
SDK: webull-python-sdk-core, webull-python-sdk-trade, webull-python-sdk-trade-events-core
"""

import asyncio
import logging
from typing import Callable

from backend.config import WEBULL_APP_KEY, WEBULL_APP_SECRET
from backend.csv_importer import parse_option_symbol

logger = logging.getLogger(__name__)

# Callback type: receives a parsed trade dict on each fill
OnFillCallback = Callable[[dict], None]

_mqtt_connected = False
_fill_callbacks: list[OnFillCallback] = []


def is_configured() -> bool:
    return bool(WEBULL_APP_KEY and WEBULL_APP_SECRET)


def register_fill_callback(callback: OnFillCallback):
    _fill_callbacks.append(callback)


def _process_order_event(event: dict):
    """Process a Webull order status event."""
    status = event.get("status", "").lower()
    if status != "filled":
        return

    symbol = event.get("symbol", "")
    parsed = parse_option_symbol(symbol)
    if not parsed:
        logger.warning(f"Could not parse option symbol: {symbol}")
        return

    trade = {
        "webull_order_id": event.get("order_id"),
        "symbol": symbol,
        "ticker": parsed["ticker"],
        "option_type": parsed["option_type"],
        "strike": parsed["strike"],
        "expiry": parsed["expiry"],
        "side": event.get("side", "").lower(),
        "quantity": int(event.get("filled_quantity", 0)),
        "avg_price": float(event.get("avg_filled_price", 0)),
        "filled_at": event.get("filled_time"),
        "placed_at": event.get("placed_time"),
    }

    for cb in _fill_callbacks:
        try:
            cb(trade)
        except Exception as e:
            logger.error(f"Fill callback error: {e}")


async def connect_mqtt():
    """
    Connect to Webull MQTT trade events.

    NOTE: This requires valid API credentials and Webull developer account.
    The connection will be established using the Webull Python SDK once
    credentials are configured.
    """
    global _mqtt_connected

    if not is_configured():
        logger.warning("Webull API not configured — MQTT connection skipped")
        return

    try:
        # Import Webull SDK (only when credentials are available)
        # from webullsdktrade.api import API as TradeAPI
        # from webullsdktradeeventscore.events_client import EventsClient

        # Placeholder: actual SDK integration
        # The SDK connection flow:
        # 1. Initialize trade API with app_key, app_secret
        # 2. Authenticate and get access token
        # 3. Subscribe to order events via MQTT
        # 4. On each event, call _process_order_event

        logger.info("Webull MQTT connection initialized (SDK integration pending)")
        _mqtt_connected = True

        # Keep connection alive
        while _mqtt_connected:
            await asyncio.sleep(1)

    except ImportError:
        logger.warning(
            "Webull SDK not installed. Install with: "
            "pip install webull-python-sdk-core webull-python-sdk-trade webull-python-sdk-trade-events-core"
        )
    except Exception as e:
        logger.error(f"Webull MQTT connection error: {e}")
        _mqtt_connected = False


async def get_account_info() -> dict | None:
    """Fetch account info via Webull HTTP API."""
    if not is_configured():
        return None

    # Placeholder for SDK integration
    return {"status": "not_configured"}


async def get_open_positions() -> list[dict]:
    """Fetch open positions via Webull HTTP API."""
    if not is_configured():
        return []

    # Placeholder for SDK integration
    return []


def disconnect():
    global _mqtt_connected
    _mqtt_connected = False
    logger.info("Webull MQTT disconnected")

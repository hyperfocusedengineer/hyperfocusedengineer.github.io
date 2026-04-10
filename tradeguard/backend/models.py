from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class TradeCreate(BaseModel):
    webull_order_id: Optional[str] = None
    symbol: str
    ticker: str
    option_type: str
    strike: Optional[Decimal] = None
    expiry: Optional[date] = None
    side: str
    quantity: int
    avg_price: Decimal
    filled_at: datetime
    placed_at: Optional[datetime] = None


class TradeResponse(BaseModel):
    id: str
    webull_order_id: Optional[str] = None
    symbol: str
    ticker: str
    option_type: str
    strike: Optional[float] = None
    expiry: Optional[str] = None
    side: str
    quantity: int
    avg_price: float
    total_cost: float
    filled_at: str
    placed_at: Optional[str] = None
    created_at: str


class RoundTripResponse(BaseModel):
    id: str
    symbol: str
    ticker: str
    option_type: str
    total_buy_cost: float
    total_sell_revenue: float
    pnl: float
    pnl_pct: Optional[float] = None
    contracts: Optional[int] = None
    opened_at: Optional[str] = None
    closed_at: Optional[str] = None
    hold_hours: Optional[float] = None
    created_at: str


class RuleViolationResponse(BaseModel):
    id: str
    rule_id: str
    severity: str
    message: str
    trade_id: Optional[str] = None
    acknowledged: bool
    created_at: str


class RuleResult(BaseModel):
    triggered: bool
    severity: str  # 'warning' or 'hard_block'
    message: str
    rule_id: str


class RuleConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    params: Optional[dict] = None


class RuleConfigResponse(BaseModel):
    rule_id: str
    enabled: bool
    params: dict
    updated_at: str


class AiInsightResponse(BaseModel):
    id: str
    insight_type: str
    content: str
    context: Optional[dict] = None
    created_at: str


class AiChatRequest(BaseModel):
    message: str


class DailyStatsResponse(BaseModel):
    date: str
    trades_count: Optional[int] = None
    wins: Optional[int] = None
    losses: Optional[int] = None
    pnl: Optional[float] = None
    largest_loss: Optional[float] = None
    tickers_traded: Optional[list[str]] = None
    rules_violated: Optional[list[str]] = None


class CSVImportResponse(BaseModel):
    imported: int
    skipped: int
    errors: list[str]

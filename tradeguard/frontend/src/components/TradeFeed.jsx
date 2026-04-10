import { formatMoney, formatDateTime, pnlColor } from '../lib/format'

export default function TradeFeed({ trades = [] }) {
  if (!trades.length) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">
        No trades today
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {trades.map((trade, i) => (
        <div
          key={trade.id || i}
          className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/5 transition-colors animate-fade-in-down"
        >
          <div className="flex items-center gap-3">
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                trade.side === 'buy'
                  ? 'bg-accent/20 text-accent'
                  : 'bg-profit/20 text-profit'
              }`}
            >
              {trade.side}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-medium">{trade.ticker}</span>
                <span className="text-xs text-text-muted">
                  {trade.option_type === 'call' ? 'C' : 'P'}
                  {trade.strike ? ` $${trade.strike}` : ''}
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                {trade.quantity} @ {formatMoney(trade.avg_price)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-mono">{formatMoney(trade.total_cost || trade.quantity * trade.avg_price * 100)}</p>
            <p className="text-[11px] text-text-muted">{formatDateTime(trade.filled_at)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

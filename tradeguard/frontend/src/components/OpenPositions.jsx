import { useEffect } from 'react'
import useTradeStore from '../stores/tradeStore'
import { formatMoney, formatDate } from '../lib/format'

export default function OpenPositions() {
  const positions = useTradeStore((s) => s.openPositions)
  const fetchOpenPositions = useTradeStore((s) => s.fetchOpenPositions)

  useEffect(() => {
    fetchOpenPositions()
    const interval = setInterval(fetchOpenPositions, 60000)
    return () => clearInterval(interval)
  }, [fetchOpenPositions])

  if (!positions.length) {
    return (
      <div className="text-center py-6 text-text-muted text-sm">
        No open positions
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-text-muted text-[11px] uppercase tracking-wider">
            <th className="text-left pb-2 font-medium">Symbol</th>
            <th className="text-left pb-2 font-medium">Type</th>
            <th className="text-right pb-2 font-medium">Qty</th>
            <th className="text-right pb-2 font-medium">Cost</th>
            <th className="text-right pb-2 font-medium">Expiry</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {positions.map((pos, i) => {
            const now = new Date()
            const expiry = pos.expiry ? new Date(pos.expiry + 'T00:00:00') : null
            const daysUntil = expiry ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)) : null
            const isNearExpiry = daysUntil !== null && daysUntil <= 3

            return (
              <tr key={i} className="border-t border-border/50 hover:bg-white/5">
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{pos.ticker}</span>
                    {pos.strike && (
                      <span className="text-text-muted text-xs">${pos.strike}</span>
                    )}
                  </div>
                </td>
                <td className="py-2">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      pos.option_type === 'call'
                        ? 'bg-accent/15 text-accent'
                        : 'bg-warning/15 text-warning'
                    }`}
                  >
                    {pos.option_type}
                  </span>
                </td>
                <td className="py-2 text-right">{pos.quantity}</td>
                <td className="py-2 text-right">{formatMoney(pos.total_cost)}</td>
                <td className="py-2 text-right">
                  {pos.expiry && (
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={isNearExpiry ? 'text-warning' : ''}>
                        {formatDate(pos.expiry)}
                      </span>
                      {isNearExpiry && (
                        <span className="text-[10px] bg-warning/20 text-warning px-1 py-0.5 rounded animate-pulse">
                          {daysUntil}d
                        </span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

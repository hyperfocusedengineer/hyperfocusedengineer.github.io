import { useEffect, useState } from 'react'
import useTradeStore from '../stores/tradeStore'
import { formatMoney, formatPct, formatDateTime, formatHoldTime, pnlColor } from '../lib/format'

const TICKERS = ['All', 'NVDA', 'GOOG', 'AAPL', 'QQQ', 'AMZN', 'META', 'ARM']
const TYPES = ['All', 'call', 'put']
const RESULTS = ['All', 'win', 'loss']

export default function History() {
  const roundTrips = useTradeStore((s) => s.roundTrips)
  const fetchRoundTrips = useTradeStore((s) => s.fetchRoundTrips)

  const [ticker, setTicker] = useState('All')
  const [optionType, setOptionType] = useState('All')
  const [result, setResult] = useState('All')
  const [sortBy, setSortBy] = useState('closed_at')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    const params = {}
    if (ticker !== 'All') params.ticker = ticker
    if (optionType !== 'All') params.option_type = optionType
    if (result !== 'All') params.result = result
    fetchRoundTrips(params)
  }, [ticker, optionType, result, fetchRoundTrips])

  const sorted = [...roundTrips].sort((a, b) => {
    const aVal = a[sortBy]
    const bVal = b[sortBy]
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    }
    return sortDir === 'asc'
      ? String(aVal || '').localeCompare(String(bVal || ''))
      : String(bVal || '').localeCompare(String(aVal || ''))
  })

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return null
    return <span className="ml-1">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
  }

  // Summary
  const totalPnl = roundTrips.reduce((s, r) => s + (r.pnl || 0), 0)
  const wins = roundTrips.filter((r) => r.pnl > 0).length
  const losses = roundTrips.length - wins

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Trade History</h2>
        <div className="flex items-center gap-4 text-sm font-mono">
          <span className={pnlColor(totalPnl)}>
            {formatMoney(totalPnl)} total
          </span>
          <span className="text-text-muted">
            {roundTrips.length} trades ({wins}W / {losses}L)
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <FilterGroup label="Ticker" options={TICKERS} value={ticker} onChange={setTicker} />
        <FilterGroup label="Type" options={TYPES} value={optionType} onChange={setOptionType} />
        <FilterGroup label="Result" options={RESULTS} value={result} onChange={setResult} />
      </div>

      {/* Table */}
      <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted text-[11px] uppercase tracking-wider bg-bg-primary/50">
                <Th onClick={() => handleSort('closed_at')}>Date <SortIcon col="closed_at" /></Th>
                <Th onClick={() => handleSort('ticker')}>Symbol <SortIcon col="ticker" /></Th>
                <Th>Type</Th>
                <Th onClick={() => handleSort('pnl')} right>P&L <SortIcon col="pnl" /></Th>
                <Th onClick={() => handleSort('pnl_pct')} right>P&L% <SortIcon col="pnl_pct" /></Th>
                <Th onClick={() => handleSort('hold_hours')} right>Hold Time <SortIcon col="hold_hours" /></Th>
                <Th onClick={() => handleSort('total_buy_cost')} right>Size <SortIcon col="total_buy_cost" /></Th>
                <Th right>Contracts</Th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {sorted.map((rt) => (
                <tr
                  key={rt.id}
                  className="border-t border-border/50 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-2.5 text-text-muted text-xs">
                    {formatDateTime(rt.closed_at)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{rt.ticker}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        rt.option_type === 'call'
                          ? 'bg-accent/15 text-accent'
                          : 'bg-warning/15 text-warning'
                      }`}
                    >
                      {rt.option_type}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-medium ${pnlColor(rt.pnl)}`}>
                    {formatMoney(rt.pnl)}
                  </td>
                  <td className={`px-4 py-2.5 text-right ${pnlColor(rt.pnl_pct)}`}>
                    {formatPct(rt.pnl_pct)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-text-muted">
                    {formatHoldTime(rt.hold_hours)}
                  </td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(rt.total_buy_cost)}</td>
                  <td className="px-4 py-2.5 text-right text-text-muted">{rt.contracts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!sorted.length && (
          <div className="text-center py-8 text-text-muted text-sm">No trades found</div>
        )}
      </div>
    </div>
  )
}

function Th({ children, onClick, right }) {
  return (
    <th
      className={`px-4 py-3 font-medium whitespace-nowrap ${right ? 'text-right' : 'text-left'} ${
        onClick ? 'cursor-pointer hover:text-text-primary select-none' : ''
      }`}
      onClick={onClick}
    >
      {children}
    </th>
  )
}

function FilterGroup({ label, options, value, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-text-muted">{label}:</span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              value === opt
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'bg-bg-primary text-text-muted border border-border hover:text-text-primary'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

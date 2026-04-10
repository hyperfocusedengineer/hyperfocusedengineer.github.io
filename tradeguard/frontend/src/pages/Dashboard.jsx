import { useEffect } from 'react'
import useTradeStore from '../stores/tradeStore'
import useRuleStore from '../stores/ruleStore'
import TradeFeed from '../components/TradeFeed'
import RulePanel from '../components/RulePanel'
import PnLChart from '../components/PnLChart'
import OpenPositions from '../components/OpenPositions'
import { formatMoney, formatMoneyShort } from '../lib/format'

export default function Dashboard() {
  const todayData = useTradeStore((s) => s.todayData)
  const fetchTodayData = useTradeStore((s) => s.fetchTodayData)
  const violations = useRuleStore((s) => s.violations)
  const fetchViolations = useRuleStore((s) => s.fetchViolations)

  useEffect(() => {
    fetchTodayData()
    fetchViolations()
    const interval = setInterval(() => {
      fetchTodayData()
      fetchViolations()
    }, 15000)
    return () => clearInterval(interval)
  }, [fetchTodayData, fetchViolations])

  const summary = todayData?.summary || { pnl: 0, wins: 0, losses: 0, trades_count: 0 }
  const todayTrades = todayData?.trades || []
  const unackViolations = (violations || []).filter((v) => !v.acknowledged)

  return (
    <div className="p-6 space-y-6">
      {/* Top Bar */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Today's P&L"
          value={formatMoney(summary.pnl)}
          large
          color={summary.pnl >= 0 ? 'profit' : 'loss'}
        />
        <StatCard label="Trades" value={summary.trades_count} />
        <StatCard
          label="W / L"
          value={`${summary.wins} / ${summary.losses}`}
          color={summary.wins > summary.losses ? 'profit' : summary.losses > summary.wins ? 'loss' : 'muted'}
        />
        <StatCard
          label="Rule Violations"
          value={unackViolations.length}
          color={unackViolations.length > 0 ? 'warning' : 'muted'}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Trade Feed + Open Positions */}
        <div className="col-span-5 space-y-6">
          <Card title="Live Trade Feed">
            <TradeFeed trades={todayTrades} />
          </Card>
          <Card title="Open Positions">
            <OpenPositions />
          </Card>
        </div>

        {/* Center: P&L Chart */}
        <div className="col-span-4">
          <Card title="Weekly P&L">
            <PnLChart />
          </Card>
        </div>

        {/* Right: Rule Panel */}
        <div className="col-span-3">
          <Card title="Rule Status">
            <RulePanel />
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, large, color = 'muted' }) {
  const colorClass = {
    profit: 'text-profit',
    loss: 'text-loss',
    warning: 'text-warning',
    muted: 'text-text-primary',
  }[color]

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4">
      <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">{label}</p>
      <p
        className={`font-mono font-bold animate-count ${colorClass} ${
          large ? 'text-2xl' : 'text-lg'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

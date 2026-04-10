import { useEffect } from 'react'
import useRuleStore from '../stores/ruleStore'

const RULE_DESCRIPTIONS = {
  nvda_call_block: 'Blocks NVDA call purchases',
  position_size_cap: 'Blocks positions over size cap',
  expiry_week_hold: 'Warns on near-expiry positions',
  daily_loss_stop: 'Stops trading after daily loss limit',
  weekly_ticker_limit: 'Warns on too many tickers per week',
  single_loss_threshold: 'Warns on large unrealized losses',
}

export default function RulePanel() {
  const rulesStatus = useRuleStore((s) => s.rulesStatus)
  const fetchRulesStatus = useRuleStore((s) => s.fetchRulesStatus)
  const getRuleLabel = useRuleStore((s) => s.getRuleLabel)

  useEffect(() => {
    fetchRulesStatus()
    const interval = setInterval(fetchRulesStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchRulesStatus])

  return (
    <div className="space-y-1.5">
      {rulesStatus.map((rule) => (
        <div
          key={rule.rule_id}
          className={`flex items-center justify-between px-3 py-2 rounded-md border ${
            !rule.enabled
              ? 'border-border bg-bg-primary opacity-50'
              : rule.status === 'triggered'
              ? 'border-warning/30 bg-warning/5'
              : 'border-border bg-bg-primary'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-2 h-2 rounded-full ${
                !rule.enabled
                  ? 'bg-text-muted'
                  : rule.status === 'triggered'
                  ? 'bg-warning animate-pulse'
                  : 'bg-profit'
              }`}
            />
            <div>
              <p className="text-xs font-medium">{getRuleLabel(rule.rule_id)}</p>
              <p className="text-[10px] text-text-muted">{RULE_DESCRIPTIONS[rule.rule_id]}</p>
            </div>
          </div>
          {rule.status === 'triggered' && (
            <span className="text-[10px] font-mono text-warning bg-warning/10 px-1.5 py-0.5 rounded">
              {rule.active_violations}
            </span>
          )}
        </div>
      ))}
      {!rulesStatus.length && (
        <p className="text-xs text-text-muted text-center py-4">Loading rules...</p>
      )}
    </div>
  )
}

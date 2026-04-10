import { useEffect, useState } from 'react'
import * as api from '../lib/api'
import AiChat from '../components/AiChat'
import { formatDateTime } from '../lib/format'

export default function Insights() {
  const [insights, setInsights] = useState([])
  const [filter, setFilter] = useState('all')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('feed')

  useEffect(() => {
    loadInsights()
  }, [filter])

  const loadInsights = async () => {
    try {
      const params = {}
      if (filter !== 'all') params.insight_type = filter
      const data = await api.getInsights(params)
      setInsights(data)
    } catch (err) {
      console.error('Failed to load insights:', err)
    }
  }

  const triggerReview = async () => {
    setReviewLoading(true)
    try {
      await api.triggerWeeklyReview()
      await loadInsights()
    } catch (err) {
      console.error('Failed to trigger review:', err)
    } finally {
      setReviewLoading(false)
    }
  }

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'post_trade', label: 'Post-Trade' },
    { value: 'weekly_review', label: 'Weekly Review' },
    { value: 'on_demand', label: 'Chat' },
  ]

  const TYPE_STYLES = {
    post_trade: { bg: 'bg-accent/10', text: 'text-accent', label: 'Post-Trade' },
    weekly_review: { bg: 'bg-profit/10', text: 'text-profit', label: 'Weekly Review' },
    on_demand: { bg: 'bg-warning/10', text: 'text-warning', label: 'Chat' },
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">AI Insights</h2>
        <button
          onClick={triggerReview}
          disabled={reviewLoading}
          className="px-4 py-2 bg-accent hover:bg-accent/80 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {reviewLoading ? 'Generating...' : 'Generate Weekly Review'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <TabButton active={activeTab === 'feed'} onClick={() => setActiveTab('feed')}>
          Insights Feed
        </TabButton>
        <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')}>
          Ask Coach
        </TabButton>
      </div>

      {activeTab === 'feed' ? (
        <>
          {/* Filters */}
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                  filter === f.value
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'bg-bg-primary text-text-muted border border-border hover:text-text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Insights Feed */}
          <div className="space-y-4">
            {insights.map((insight) => {
              const style = TYPE_STYLES[insight.insight_type] || TYPE_STYLES.on_demand
              return (
                <div
                  key={insight.id}
                  className="bg-bg-surface border border-border rounded-lg p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                    <span className="text-xs text-text-muted">{formatDateTime(insight.created_at)}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
                    {insight.content}
                  </p>
                  {insight.context && insight.insight_type === 'post_trade' && (
                    <div className="mt-3 pt-3 border-t border-border/50 flex gap-4 text-xs text-text-muted font-mono">
                      {insight.context.symbol && <span>{insight.context.symbol}</span>}
                      {insight.context.pnl != null && (
                        <span className={insight.context.pnl >= 0 ? 'text-profit' : 'text-loss'}>
                          P&L: ${insight.context.pnl?.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {!insights.length && (
              <div className="text-center py-12 text-text-muted text-sm">
                No insights yet. Import trades and generate your first analysis.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-bg-surface border border-border rounded-lg h-[500px]">
          <AiChat />
        </div>
      )}
    </div>
  )
}

function TabButton({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
        active
          ? 'border-accent text-accent'
          : 'border-transparent text-text-muted hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  )
}

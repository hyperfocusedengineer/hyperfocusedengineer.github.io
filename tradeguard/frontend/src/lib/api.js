const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

// Trades
export const getTrades = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return request(`/trades${qs ? `?${qs}` : ''}`)
}

export const getRoundTrips = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return request(`/trades/round-trips${qs ? `?${qs}` : ''}`)
}

export const getOpenPositions = () => request('/trades/open-positions')
export const getTodayTrades = () => request('/trades/today')

// Analytics
export const getPnlByTicker = () => request('/analytics/pnl-by-ticker')
export const getCallsVsPuts = () => request('/analytics/calls-vs-puts')
export const getWinRateRolling = (window = 20) => request(`/analytics/win-rate-rolling?window=${window}`)
export const getSizeVsPnl = () => request('/analytics/size-vs-pnl')
export const getHoldTimeDistribution = () => request('/analytics/hold-time-distribution')
export const getHourlyPerformance = () => request('/analytics/hourly-performance')
export const getWeeklyPnl = (weeks = 12) => request(`/analytics/weekly-pnl?weeks=${weeks}`)
export const getDailyStats = (days = 30) => request(`/analytics/daily-stats?days=${days}`)

// Rules
export const getRulesConfig = () => request('/rules/config')
export const updateRuleConfig = (ruleId, data) =>
  request(`/rules/config/${ruleId}`, { method: 'PUT', body: JSON.stringify(data) })
export const getViolations = (limit = 50) => request(`/rules/violations?limit=${limit}`)
export const acknowledgeViolation = (id) =>
  request(`/rules/violations/${id}/acknowledge`, { method: 'POST' })
export const checkPositions = () => request('/rules/check-positions', { method: 'POST' })
export const getRulesStatus = () => request('/rules/status')

// AI
export const getInsights = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return request(`/ai/insights${qs ? `?${qs}` : ''}`)
}
export const triggerWeeklyReview = () => request('/ai/weekly-review', { method: 'POST' })
export const aiChat = (message) =>
  request('/ai/chat', { method: 'POST', body: JSON.stringify({ message }) })
export const analyzeTrade = (roundTripId) =>
  request(`/ai/analyze-trade/${roundTripId}`, { method: 'POST' })

// Import
export const importCSV = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE}/import/csv`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error(`Import failed: ${res.status}`)
  return res.json()
}

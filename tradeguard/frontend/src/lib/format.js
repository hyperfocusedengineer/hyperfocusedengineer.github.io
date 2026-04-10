/**
 * Format a number as USD currency.
 */
export function formatMoney(amount) {
  if (amount == null || isNaN(amount)) return '$0.00'
  const abs = Math.abs(amount)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return amount < 0 ? `-$${formatted}` : `$${formatted}`
}

/**
 * Format money with no decimals for large numbers.
 */
export function formatMoneyShort(amount) {
  if (amount == null || isNaN(amount)) return '$0'
  const abs = Math.abs(amount)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return amount < 0 ? `-$${formatted}` : `$${formatted}`
}

/**
 * Format a percentage.
 */
export function formatPct(value) {
  if (value == null || isNaN(value)) return '0.0%'
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

/**
 * Format an ISO datetime to EDT display.
 */
export function formatDateTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format date only.
 */
export function formatDate(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format hold time hours into human readable.
 */
export function formatHoldTime(hours) {
  if (hours == null) return ''
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

/**
 * CSS class for P&L coloring.
 */
export function pnlColor(amount) {
  if (amount > 0) return 'text-profit'
  if (amount < 0) return 'text-loss'
  return 'text-text-muted'
}

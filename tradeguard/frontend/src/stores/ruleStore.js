import { create } from 'zustand'
import * as api from '../lib/api'

const RULE_LABELS = {
  nvda_call_block: 'NVDA Call Block',
  position_size_cap: 'Position Size Cap ($15K)',
  expiry_week_hold: 'Expiry Week Hold Warning',
  daily_loss_stop: 'Daily 2-Loss Stop',
  weekly_ticker_limit: 'Weekly Ticker Limit (4)',
  single_loss_threshold: 'Single Loss Threshold ($8K)',
}

const useRuleStore = create((set) => ({
  rulesStatus: [],
  rulesConfig: [],
  violations: [],
  toasts: [],
  loading: false,

  fetchRulesStatus: async () => {
    try {
      const data = await api.getRulesStatus()
      set({ rulesStatus: data })
    } catch (err) {
      console.error('Failed to fetch rules status:', err)
    }
  },

  fetchRulesConfig: async () => {
    set({ loading: true })
    try {
      const data = await api.getRulesConfig()
      set({ rulesConfig: data, loading: false })
    } catch (err) {
      set({ loading: false })
    }
  },

  fetchViolations: async (limit = 50) => {
    try {
      const data = await api.getViolations(limit)
      set({ violations: data })
    } catch (err) {
      console.error('Failed to fetch violations:', err)
    }
  },

  updateRule: async (ruleId, updates) => {
    try {
      await api.updateRuleConfig(ruleId, updates)
      const data = await api.getRulesConfig()
      set({ rulesConfig: data })
    } catch (err) {
      console.error('Failed to update rule:', err)
    }
  },

  acknowledgeViolation: async (id) => {
    try {
      await api.acknowledgeViolation(id)
      set((state) => ({
        violations: state.violations.map((v) =>
          v.id === id ? { ...v, acknowledged: true } : v
        ),
      }))
    } catch (err) {
      console.error('Failed to acknowledge violation:', err)
    }
  },

  addToast: (violation) => {
    const id = Date.now()
    set((state) => ({
      toasts: [...state.toasts, { ...violation, toastId: id }],
    }))
    // Auto-remove after 8 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.toastId !== id),
      }))
    }, 8000)
  },

  removeToast: (toastId) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.toastId !== toastId),
    }))
  },

  getRuleLabel: (ruleId) => RULE_LABELS[ruleId] || ruleId,
}))

export default useRuleStore

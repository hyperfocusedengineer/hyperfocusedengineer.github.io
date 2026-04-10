import { create } from 'zustand'
import * as api from '../lib/api'

const useTradeStore = create((set, get) => ({
  // State
  todayData: null,
  trades: [],
  roundTrips: [],
  openPositions: [],
  loading: false,
  error: null,

  // Actions
  fetchTodayData: async () => {
    set({ loading: true, error: null })
    try {
      const data = await api.getTodayTrades()
      set({ todayData: data, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  fetchTrades: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const data = await api.getTrades(params)
      set({ trades: data, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  fetchRoundTrips: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const data = await api.getRoundTrips(params)
      set({ roundTrips: data, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  fetchOpenPositions: async () => {
    try {
      const data = await api.getOpenPositions()
      set({ openPositions: data })
    } catch (err) {
      set({ error: err.message })
    }
  },

  addRealtimeTrade: (trade) => {
    set((state) => ({
      trades: [trade, ...state.trades],
    }))
    // Refresh today data
    get().fetchTodayData()
  },
}))

export default useTradeStore

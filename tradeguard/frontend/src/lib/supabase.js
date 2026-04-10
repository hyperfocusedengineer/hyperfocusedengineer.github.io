import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

/**
 * Subscribe to real-time trade inserts.
 * Returns an unsubscribe function.
 */
export function onNewTrade(callback) {
  if (!supabase) return () => {}

  const channel = supabase
    .channel('trades-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trades' }, (payload) => {
      callback(payload.new)
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}

/**
 * Subscribe to real-time rule violation inserts.
 */
export function onNewViolation(callback) {
  if (!supabase) return () => {}

  const channel = supabase
    .channel('violations-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rule_violations' }, (payload) => {
      callback(payload.new)
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}

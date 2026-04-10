import useRuleStore from '../stores/ruleStore'

export default function RuleAlertToasts() {
  const toasts = useRuleStore((s) => s.toasts)
  const removeToast = useRuleStore((s) => s.removeToast)

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.toastId}
          className={`animate-slide-in-right rounded-lg border p-4 shadow-2xl backdrop-blur-sm ${
            toast.severity === 'hard_block'
              ? 'bg-loss/10 border-loss/40 text-loss'
              : 'bg-warning/10 border-warning/40 text-warning'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {toast.severity === 'hard_block' ? (
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="text-xs font-bold uppercase tracking-wider">
                  {toast.severity === 'hard_block' ? 'BLOCKED' : 'WARNING'}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-text-primary">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.toastId)}
              className="text-text-muted hover:text-text-primary shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Full-screen hard block overlay.
 */
export function HardBlockOverlay({ message, onDismiss }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-bg-surface border border-loss/40 rounded-xl p-8 max-w-lg mx-4 text-center">
        <div className="w-16 h-16 rounded-full bg-loss/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-loss" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-loss mb-3">Trade Blocked</h2>
        <p className="text-text-primary mb-6 leading-relaxed">{message}</p>
        <button
          onClick={onDismiss}
          className="px-6 py-2.5 bg-loss/20 hover:bg-loss/30 text-loss border border-loss/40 rounded-lg text-sm font-medium transition-colors"
        >
          I Understand
        </button>
      </div>
    </div>
  )
}

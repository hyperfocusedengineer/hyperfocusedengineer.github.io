import { useEffect, useState, useRef } from 'react'
import useRuleStore from '../stores/ruleStore'
import { importCSV } from '../lib/api'

export default function Settings() {
  const rulesConfig = useRuleStore((s) => s.rulesConfig)
  const fetchRulesConfig = useRuleStore((s) => s.fetchRulesConfig)
  const updateRule = useRuleStore((s) => s.updateRule)
  const getRuleLabel = useRuleStore((s) => s.getRuleLabel)

  const [importResult, setImportResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    fetchRulesConfig()
  }, [fetchRulesConfig])

  const handleImport = async () => {
    const file = fileRef.current?.files[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)
    try {
      const result = await importCSV(file)
      setImportResult(result)
    } catch (err) {
      setImportResult({ error: err.message })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <h2 className="text-lg font-bold">Settings</h2>

      {/* Rule Configuration */}
      <Section title="Rule Configuration" description="Toggle rules on/off and adjust thresholds.">
        <div className="space-y-3">
          {rulesConfig.map((rule) => (
            <div key={rule.rule_id} className="bg-bg-primary border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-medium">{getRuleLabel(rule.rule_id)}</h4>
                  <p className="text-xs text-text-muted mt-0.5">{rule.rule_id}</p>
                </div>
                <Toggle
                  enabled={rule.enabled}
                  onChange={(enabled) => updateRule(rule.rule_id, { enabled })}
                />
              </div>
              {rule.params && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(rule.params).map(([key, value]) => (
                    <ParamEditor
                      key={key}
                      paramKey={key}
                      value={value}
                      onSave={(newValue) => {
                        const newParams = { ...rule.params, [key]: newValue }
                        updateRule(rule.rule_id, { params: newParams })
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* CSV Import */}
      <Section title="CSV Import" description="Import trades from a Webull CSV export. Duplicates are automatically skipped.">
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="text-sm text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-border file:bg-bg-primary file:text-text-primary file:text-sm file:font-medium file:cursor-pointer hover:file:bg-white/5"
          />
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-4 py-2 bg-accent hover:bg-accent/80 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
        {importResult && (
          <div
            className={`mt-3 p-3 rounded-lg text-sm ${
              importResult.error
                ? 'bg-loss/10 text-loss border border-loss/30'
                : 'bg-profit/10 text-profit border border-profit/30'
            }`}
          >
            {importResult.error ? (
              <p>Error: {importResult.error}</p>
            ) : (
              <div>
                <p>Imported: {importResult.imported} trades</p>
                <p>Skipped: {importResult.skipped} duplicates</p>
                {importResult.errors?.length > 0 && (
                  <p className="text-warning mt-1">Errors: {importResult.errors.join(', ')}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* API Credentials Info */}
      <Section title="API Credentials" description="Configure API keys via environment variables on the backend.">
        <div className="space-y-2 text-sm text-text-muted">
          <EnvVar name="SUPABASE_URL" />
          <EnvVar name="SUPABASE_KEY" />
          <EnvVar name="WEBULL_APP_KEY" />
          <EnvVar name="WEBULL_APP_SECRET" />
          <EnvVar name="ANTHROPIC_API_KEY" />
        </div>
        <p className="text-xs text-text-muted mt-3">
          Set these in the backend <code className="text-accent">.env</code> file. Never commit credentials to git.
        </p>
      </Section>
    </div>
  )
}

function Section({ title, description, children }) {
  return (
    <div>
      <h3 className="text-sm font-bold mb-1">{title}</h3>
      <p className="text-xs text-text-muted mb-4">{description}</p>
      {children}
    </div>
  )
}

function Toggle({ enabled, onChange }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        enabled ? 'bg-profit' : 'bg-border'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-5' : ''
        }`}
      />
    </button>
  )
}

function ParamEditor({ paramKey, value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState(JSON.stringify(value))

  const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value)

  const handleSave = () => {
    try {
      const parsed = JSON.parse(inputValue)
      onSave(parsed)
      setEditing(false)
    } catch {
      // Invalid JSON, try as-is
      onSave(inputValue)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-text-muted">{paramKey}:</span>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="bg-bg-primary border border-accent/40 rounded px-2 py-1 text-xs text-text-primary font-mono focus:outline-none w-32"
          autoFocus
        />
        <button onClick={handleSave} className="text-xs text-profit hover:text-profit/80">Save</button>
        <button onClick={() => setEditing(false)} className="text-xs text-text-muted hover:text-text-primary">Cancel</button>
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        setInputValue(JSON.stringify(value))
        setEditing(true)
      }}
      className="flex items-center gap-1.5 bg-bg-surface px-2.5 py-1 rounded border border-border hover:border-accent/30 transition-colors group"
    >
      <span className="text-[11px] text-text-muted">{paramKey}:</span>
      <span className="text-xs font-mono text-text-primary">{displayValue}</span>
      <svg className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </button>
  )
}

function EnvVar({ name }) {
  return (
    <div className="flex items-center gap-2">
      <code className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded">{name}</code>
      <span className="text-xs text-text-muted">Set via .env</span>
    </div>
  )
}

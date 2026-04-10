import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, LineChart, Line, CartesianGrid,
} from 'recharts'
import * as api from '../lib/api'
import { formatMoney, formatMoneyShort } from '../lib/format'

const CHART_STYLE = {
  background: '#12121a',
  border: '1px solid #1e1e2e',
  borderRadius: '8px',
  fontSize: '11px',
  fontFamily: 'JetBrains Mono',
}

export default function Analytics() {
  const [pnlByTicker, setPnlByTicker] = useState([])
  const [callsVsPuts, setCallsVsPuts] = useState(null)
  const [winRate, setWinRate] = useState([])
  const [sizeVsPnl, setSizeVsPnl] = useState([])
  const [holdTime, setHoldTime] = useState([])
  const [hourly, setHourly] = useState([])

  useEffect(() => {
    api.getPnlByTicker().then(setPnlByTicker).catch(console.error)
    api.getCallsVsPuts().then(setCallsVsPuts).catch(console.error)
    api.getWinRateRolling(20).then(setWinRate).catch(console.error)
    api.getSizeVsPnl().then(setSizeVsPnl).catch(console.error)
    api.getHoldTimeDistribution().then(setHoldTime).catch(console.error)
    api.getHourlyPerformance().then(setHourly).catch(console.error)
  }, [])

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-bold">Analytics</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* P&L by Ticker */}
        <ChartCard title="P&L by Ticker">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={pnlByTicker} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis dataKey="ticker" tick={{ fill: '#6b6b80', fontSize: 11 }} axisLine={{ stroke: '#1e1e2e' }} tickLine={false} />
              <YAxis tick={{ fill: '#6b6b80', fontSize: 10 }} tickFormatter={formatMoneyShort} axisLine={false} tickLine={false} width={55} />
              <Tooltip contentStyle={CHART_STYLE} formatter={(v) => [formatMoney(v), 'P&L']} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {pnlByTicker.map((e, i) => (
                  <Cell key={i} fill={e.pnl >= 0 ? '#00d4aa' : '#ff4757'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Calls vs Puts */}
        <ChartCard title="Calls vs Puts Performance">
          {callsVsPuts && (
            <div className="grid grid-cols-2 gap-4 h-[250px] items-center">
              {['call', 'put'].map((type) => {
                const d = callsVsPuts[type]
                const winRate = d.count > 0 ? ((d.wins / d.count) * 100).toFixed(1) : 0
                return (
                  <div
                    key={type}
                    className={`p-5 rounded-lg border ${
                      type === 'call' ? 'border-accent/30 bg-accent/5' : 'border-warning/30 bg-warning/5'
                    }`}
                  >
                    <p className={`text-sm font-bold uppercase mb-3 ${type === 'call' ? 'text-accent' : 'text-warning'}`}>
                      {type}s
                    </p>
                    <p className={`text-xl font-mono font-bold mb-1 ${d.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {formatMoney(d.pnl)}
                    </p>
                    <p className="text-xs text-text-muted">{d.count} trades</p>
                    <p className="text-xs text-text-muted">{winRate}% win rate</p>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>

        {/* Win Rate Rolling */}
        <ChartCard title="Win Rate (Rolling 20-Trade Avg)">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={winRate} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#1e1e2e" strokeDasharray="3 3" />
              <XAxis dataKey="trade_index" tick={{ fill: '#6b6b80', fontSize: 10 }} axisLine={{ stroke: '#1e1e2e' }} tickLine={false} />
              <YAxis tick={{ fill: '#6b6b80', fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={CHART_STYLE} formatter={(v) => [`${v}%`, 'Win Rate']} />
              <Line type="monotone" dataKey="win_rate" stroke="#5865f2" strokeWidth={2} dot={false} />
              {/* 50% reference line */}
              <Line type="monotone" dataKey={() => 50} stroke="#6b6b80" strokeWidth={1} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Position Size vs P&L */}
        <ChartCard title="Position Size vs P&L">
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#1e1e2e" strokeDasharray="3 3" />
              <XAxis type="number" dataKey="size" name="Size" tick={{ fill: '#6b6b80', fontSize: 10 }} tickFormatter={formatMoneyShort} axisLine={{ stroke: '#1e1e2e' }} tickLine={false} />
              <YAxis type="number" dataKey="pnl" name="P&L" tick={{ fill: '#6b6b80', fontSize: 10 }} tickFormatter={formatMoneyShort} axisLine={false} tickLine={false} width={55} />
              <Tooltip contentStyle={CHART_STYLE} formatter={(v, name) => [formatMoney(v), name]} />
              <Scatter data={sizeVsPnl.filter((d) => d.pnl >= 0)} fill="#00d4aa" opacity={0.6} />
              <Scatter data={sizeVsPnl.filter((d) => d.pnl < 0)} fill="#ff4757" opacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Hold Time Distribution */}
        <ChartCard title="Hold Time Distribution">
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#1e1e2e" strokeDasharray="3 3" />
              <XAxis type="number" dataKey="hold_hours" name="Hours" tick={{ fill: '#6b6b80', fontSize: 10 }} tickFormatter={(v) => `${v}h`} axisLine={{ stroke: '#1e1e2e' }} tickLine={false} />
              <YAxis type="number" dataKey="pnl" name="P&L" tick={{ fill: '#6b6b80', fontSize: 10 }} tickFormatter={formatMoneyShort} axisLine={false} tickLine={false} width={55} />
              <Tooltip contentStyle={CHART_STYLE} formatter={(v, name) => [name === 'P&L' ? formatMoney(v) : `${v.toFixed(1)}h`, name]} />
              <Scatter data={holdTime.filter((d) => d.pnl >= 0)} fill="#00d4aa" opacity={0.6} />
              <Scatter data={holdTime.filter((d) => d.pnl < 0)} fill="#ff4757" opacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Hourly Performance */}
        <ChartCard title="Best / Worst Hour of Day">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hourly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis
                dataKey="hour"
                tick={{ fill: '#6b6b80', fontSize: 10 }}
                tickFormatter={(h) => {
                  const ampm = h >= 12 ? 'PM' : 'AM'
                  const hr = h % 12 || 12
                  return `${hr}${ampm}`
                }}
                axisLine={{ stroke: '#1e1e2e' }}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#6b6b80', fontSize: 10 }} tickFormatter={formatMoneyShort} axisLine={false} tickLine={false} width={55} />
              <Tooltip contentStyle={CHART_STYLE} formatter={(v) => [formatMoney(v), 'P&L']} labelFormatter={(h) => `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'} ET`} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {hourly.map((e, i) => (
                  <Cell key={i} fill={e.pnl >= 0 ? '#00d4aa' : '#ff4757'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

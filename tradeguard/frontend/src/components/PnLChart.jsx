import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getWeeklyPnl } from '../lib/api'
import { formatMoneyShort } from '../lib/format'

export default function PnLChart() {
  const [data, setData] = useState([])

  useEffect(() => {
    getWeeklyPnl(12)
      .then((d) => setData(d))
      .catch(console.error)
  }, [])

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        No data available
      </div>
    )
  }

  // Check if this is the current week
  const now = new Date()
  const currentMonday = new Date(now)
  currentMonday.setDate(now.getDate() - now.getDay() + 1)
  const currentWeek = currentMonday.toISOString().slice(0, 10)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <XAxis
          dataKey="week"
          tick={{ fill: '#6b6b80', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          tickFormatter={(v) => {
            const d = new Date(v + 'T00:00:00')
            return `${d.getMonth() + 1}/${d.getDate()}`
          }}
          axisLine={{ stroke: '#1e1e2e' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6b6b80', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          tickFormatter={(v) => formatMoneyShort(v)}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip
          contentStyle={{
            background: '#12121a',
            border: '1px solid #1e1e2e',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'JetBrains Mono',
          }}
          formatter={(value) => [formatMoneyShort(value), 'P&L']}
          labelFormatter={(v) => `Week of ${v}`}
        />
        <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.week}
              fill={entry.pnl >= 0 ? '#00d4aa' : '#ff4757'}
              opacity={entry.week === currentWeek ? 1 : 0.7}
              stroke={entry.week === currentWeek ? '#5865f2' : 'none'}
              strokeWidth={entry.week === currentWeek ? 2 : 0}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

import { useEffect, useState } from 'react'
import { getProgress, getWeeklyProgress } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

type ChartMetric = 'calories' | 'protein' | 'carbs' | 'fat'

const METRICS: { key: ChartMetric; label: string; unit: string; color: string; light: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: '#16a34a', light: '#dcfce7' },
  { key: 'protein',  label: 'Protein',  unit: 'g',    color: '#3b82f6', light: '#dbeafe' },
  { key: 'carbs',    label: 'Carbs',    unit: 'g',    color: '#f59e0b', light: '#fef3c7' },
  { key: 'fat',      label: 'Fat',      unit: 'g',    color: '#ef4444', light: '#fee2e2' },
]
const MACRO_COLORS = ['#3b82f6', '#f59e0b', '#ef4444']

function IntakeBar({ label, consumed, target, unit, color }: any) {
  const pct  = target ? Math.min((consumed / target) * 100, 100) : 0
  const over = consumed > target
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className={`text-xs font-semibold ${over ? 'text-red-500' : 'text-gray-400'}`}>
          {consumed.toFixed(1)} / {target.toFixed(1)} {unit}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: over ? '#ef4444' : color }} />
      </div>
    </div>
  )
}

export default function Progress() {
  const { user }        = useAuth()
  const activeProfileId = user?.active_profile_id

  const [progress, setProgress] = useState<any>(null)
  const [weekly, setWeekly]     = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [metric, setMetric]     = useState<ChartMetric>('calories')

  useEffect(() => {
    setLoading(true)
    Promise.all([getProgress(), getWeeklyProgress()])
      .then(([p, w]) => { setProgress(p.data); setWeekly(w.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeProfileId])

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )

  const consumed  = progress?.consumed_today || {}
  const targets   = progress?.daily_targets  || {}
  const tips      = progress?.tips           || []
  const streak    = progress?.streak         || 0
  const isPerfect = progress?.is_perfect_day || false
  const macrosPct = progress?.macros_pct     || {}

  const sel = METRICS.find(m => m.key === metric)!
  const targetVal: Record<ChartMetric, number> = {
    calories: targets.daily_calories || 1,
    protein : targets.protein_g      || 1,
    carbs   : targets.carbs_g        || 1,
    fat     : targets.fat_g          || 1,
  }

  const chartData = Object.entries(weekly?.weekly_summary || {}).map(([day, data]: any) => ({
    day : new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
    val : Math.round(data[metric] * 10) / 10
  }))

  const weeklyAvg    = weekly?.weekly_avg    || {}
  const bestDay      = weekly?.best_day
  const bestScore    = weekly?.best_day_score || 0
  const bestDayLabel = bestDay ? new Date(bestDay).toLocaleDateString('en-US', { weekday: 'long' }) : null

  const donutData = [
    { name: 'Protein', value: macrosPct.protein || 0 },
    { name: 'Carbs',   value: macrosPct.carbs   || 0 },
    { name: 'Fat',     value: macrosPct.fat     || 0 },
  ]

  // calorie progress %
  const calPct = targets.daily_calories
    ? Math.min(Math.round((consumed.calories || 0) / targets.daily_calories * 100), 100)
    : 0

  return (
    <div className="max-w-2xl mx-auto pb-8">

      {/* Header */}
      <div className="bg-primary-600 px-4 pt-6 pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-white text-xl font-extrabold">Progress</h1>
            <p className="text-primary-200 text-xs mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {/* streak badge */}
          <div className="flex flex-col items-center bg-white/15 rounded-2xl px-4 py-2.5 border border-white/20">
            <span className="text-2xl">🔥</span>
            <span className="text-white font-extrabold text-xl leading-none">{streak}</span>
            <span className="text-primary-200 text-[10px] mt-0.5">day streak</span>
          </div>
        </div>

        {/* calorie ring summary */}
        <div className="bg-white/10 rounded-2xl p-3 flex items-center gap-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
              <circle cx="32" cy="32" r="26" fill="none" stroke="white" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - calPct / 100)}`}
                strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white font-extrabold text-xs">
              {calPct}%
            </span>
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">
              {Math.round(consumed.calories || 0)} <span className="text-primary-200 font-normal text-xs">kcal consumed</span>
            </p>
            <p className="text-primary-200 text-xs mt-0.5">
              {Math.max(0, Math.round((targets.daily_calories || 0) - (consumed.calories || 0)))} kcal remaining
            </p>
            <div className="flex gap-3 mt-2">
              {[
                { label: 'P', value: `${(consumed.protein || 0).toFixed(0)}g`, color: 'text-blue-300' },
                { label: 'C', value: `${(consumed.carbs   || 0).toFixed(0)}g`, color: 'text-yellow-300' },
                { label: 'F', value: `${(consumed.fat     || 0).toFixed(0)}g`, color: 'text-red-300' },
              ].map(n => (
                <span key={n.label} className="text-xs">
                  <span className={`font-bold ${n.color}`}>{n.value}</span>
                  <span className="text-primary-300 ml-0.5">{n.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* Perfect day */}
        {isPerfect && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-4 flex items-center gap-3 shadow-md">
            <span className="text-3xl">🏆</span>
            <div>
              <p className="text-white font-extrabold text-base">Perfect Day!</p>
              <p className="text-yellow-100 text-xs">You've hit all your nutrition targets today.</p>
            </div>
          </div>
        )}

        {/* Today's intake */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 text-sm mb-4">Today's Intake</h2>
          <div className="space-y-3.5">
            <IntakeBar label="Calories" consumed={consumed.calories || 0} target={targets.daily_calories || 1} unit="kcal" color="#16a34a" />
            <IntakeBar label="Protein"  consumed={consumed.protein  || 0} target={targets.protein_g     || 1} unit="g"    color="#3b82f6" />
            <IntakeBar label="Carbs"    consumed={consumed.carbs    || 0} target={targets.carbs_g       || 1} unit="g"    color="#f59e0b" />
            <IntakeBar label="Fat"      consumed={consumed.fat      || 0} target={targets.fat_g         || 1} unit="g"    color="#ef4444" />
          </div>
        </div>

        {/* Macros donut */}
        {(consumed.calories || 0) > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 text-sm mb-1">Macros Breakdown</h2>
            <p className="text-xs text-gray-400 mb-3">% of today's calories by macro</p>
            <div className="flex items-center gap-4">
              <PieChart width={130} height={130}>
                <Pie data={donutData} cx={60} cy={60} innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value">
                  {donutData.map((_, i) => <Cell key={i} fill={MACRO_COLORS[i]} />)}
                </Pie>
              </PieChart>
              <div className="flex-1 space-y-2.5">
                {donutData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MACRO_COLORS[i] }} />
                      <span className="text-xs font-semibold text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-800">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        {tips.length > 0 && (
          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4">
            <h2 className="font-bold text-primary-700 text-sm mb-3">💡 Nutrition Tips</h2>
            <ul className="space-y-2">
              {tips.map((tip: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-primary-400 mt-0.5 flex-shrink-0">•</span>{tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 7-day chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 text-sm mb-3">7-Day Summary</h2>
            {/* metric tabs */}
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {METRICS.map(m => (
                <button key={m.key} onClick={() => setMetric(m.key)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                    metric === m.key ? 'text-white border-transparent' : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}
                  style={metric === m.key ? { backgroundColor: m.color } : {}}>
                  {m.label}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={chartData} barSize={26}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: any) => [`${v} ${sel.unit}`, sel.label]}
                  contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
                />
                <Bar dataKey="val" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.val >= targetVal[metric] ? sel.color : sel.color + '44'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-gray-400 text-center mt-1">Solid = met target · Faded = below target</p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: sel.light }}>
                <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: sel.color }}>Weekly Avg</p>
                <p className="font-extrabold text-gray-800 text-sm">
                  {Math.round(weeklyAvg[metric] || 0)}<span className="text-xs font-normal text-gray-400 ml-0.5">{sel.unit}</span>
                </p>
              </div>
              {bestDayLabel && (
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-green-600 font-semibold uppercase mb-1">Best Day</p>
                  <p className="font-extrabold text-green-700 text-sm">{bestDayLabel}</p>
                  <p className="text-[10px] text-green-500">{bestScore}% hit</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Daily targets */}
        {targets.daily_calories && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 text-sm mb-3">Daily Targets</h2>
            <div className="grid grid-cols-4 gap-2">
              {METRICS.map(m => (
                <div key={m.key} className="rounded-xl p-3 text-center" style={{ backgroundColor: m.light }}>
                  <p className="font-extrabold text-sm" style={{ color: m.color }}>
                    {Math.round(targets[m.key === 'calories' ? 'daily_calories' : m.key === 'protein' ? 'protein_g' : m.key === 'carbs' ? 'carbs_g' : 'fat_g'] || 0)}
                  </p>
                  <p className="text-[10px] mt-0.5 text-gray-500">{m.label}<br/>{m.unit}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

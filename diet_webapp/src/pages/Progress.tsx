import { useEffect, useState } from 'react'
import { getProgress, getWeeklyProgress } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'

type ChartMetric = 'calories' | 'protein' | 'carbs' | 'fat'

const METRIC_OPTIONS: { key: ChartMetric; label: string; unit: string; color: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: '#16a34a' },
  { key: 'protein',  label: 'Protein',  unit: 'g',    color: '#3b82f6' },
  { key: 'carbs',    label: 'Carbs',    unit: 'g',    color: '#f59e0b' },
  { key: 'fat',      label: 'Fat',      unit: 'g',    color: '#ef4444' },
]

const MACRO_COLORS = ['#3b82f6', '#f59e0b', '#ef4444']

function NutritionBar({ label, consumed, target, unit, color }: any) {
  const pct  = Math.min((consumed / target) * 100, 100)
  const over = consumed > target
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className={`text-xs font-semibold ${over ? 'text-red-500' : 'text-gray-400'}`}>
          {consumed.toFixed(1)} / {target.toFixed(1)} {unit}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: over ? '#ef4444' : color }}
        />
      </div>
    </div>
  )
}

export default function Progress() {
  const [progress, setProgress] = useState<any>(null)
  const [weekly, setWeekly]     = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [metric, setMetric]     = useState<ChartMetric>('calories')

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [p, w] = await Promise.all([getProgress(), getWeeklyProgress()])
        setProgress(p.data)
        setWeekly(w.data)
      } catch (_) {} finally { setLoading(false) }
    }
    fetchAll()
  }, [])

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )

  const consumed   = progress?.consumed_today || {}
  const targets    = progress?.daily_targets  || {}
  const tips       = progress?.tips           || []
  const streak     = progress?.streak         || 0
  const isPerfect  = progress?.is_perfect_day || false
  const macrosPct  = progress?.macros_pct     || {}

  const selectedMetric = METRIC_OPTIONS.find(m => m.key === metric)!
  const targetVal: Record<ChartMetric, number> = {
    calories : targets.daily_calories || 1,
    protein  : targets.protein_g      || 1,
    carbs    : targets.carbs_g        || 1,
    fat      : targets.fat_g          || 1,
  }

  const chartData = Object.entries(weekly?.weekly_summary || {}).map(([day, data]: any) => ({
    day  : new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
    date : day,
    val  : Math.round(data[metric] * 10) / 10
  }))

  const weeklyAvg  = weekly?.weekly_avg   || {}
  const bestDay    = weekly?.best_day
  const bestScore  = weekly?.best_day_score || 0
  const bestDayLabel = bestDay
    ? new Date(bestDay).toLocaleDateString('en-US', { weekday: 'long' })
    : null

  const donutData = [
    { name: 'Protein', value: macrosPct.protein || 0 },
    { name: 'Carbs',   value: macrosPct.carbs   || 0 },
    { name: 'Fat',     value: macrosPct.fat     || 0 },
  ]

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="bg-primary-600 px-4 pt-6 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">📊 Progress</h1>
            <p className="text-primary-100 text-xs mt-1">{progress?.calorie_progress || '0%'} of daily calorie goal</p>
          </div>
          {/* streak */}
          <div className="flex flex-col items-center bg-white/15 rounded-2xl px-4 py-2">
            <span className="text-2xl">🔥</span>
            <span className="text-white font-extrabold text-lg leading-none">{streak}</span>
            <span className="text-primary-200 text-[10px]">day streak</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">

        {/* Perfect day banner */}
        {isPerfect && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-4 flex items-center gap-3 shadow-md">
            <span className="text-3xl">🏆</span>
            <div>
              <p className="text-white font-extrabold text-base">Perfect Day!</p>
              <p className="text-yellow-100 text-xs">You've hit all your nutrition targets today. Amazing work!</p>
            </div>
          </div>
        )}

        {/* Today's intake */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 text-sm mb-4">Today's Intake</h2>
          <NutritionBar label="Calories" consumed={consumed.calories || 0} target={targets.daily_calories || 1} unit="kcal" color="#16a34a" />
          <NutritionBar label="Protein"  consumed={consumed.protein  || 0} target={targets.protein_g     || 1} unit="g"    color="#3b82f6" />
          <NutritionBar label="Carbs"    consumed={consumed.carbs    || 0} target={targets.carbs_g       || 1} unit="g"    color="#f59e0b" />
          <NutritionBar label="Fat"      consumed={consumed.fat      || 0} target={targets.fat_g         || 1} unit="g"    color="#ef4444" />
        </div>

        {/* Macros donut */}
        {(consumed.calories || 0) > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 text-sm mb-1">Macros Breakdown</h2>
            <p className="text-xs text-gray-400 mb-3">% of today's calories by macro</p>
            <div className="flex items-center">
              <PieChart width={140} height={140}>
                <Pie
                  data={donutData}
                  cx={65} cy={65}
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={MACRO_COLORS[i]} />
                  ))}
                </Pie>
              </PieChart>
              <div className="flex-1 space-y-2 ml-2">
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
                  <span className="text-primary-500 mt-0.5">•</span>{tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weekly chart with metric toggle */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800 text-sm">7-Day Summary</h2>
            </div>
            {/* metric toggle */}
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {METRIC_OPTIONS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                    metric === m.key
                      ? 'text-white border-transparent'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}
                  style={metric === m.key ? { backgroundColor: m.color, borderColor: m.color } : {}}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={28}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: any) => [`${v} ${selectedMetric.unit}`, selectedMetric.label]}
                  contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
                />
                <Bar dataKey="val" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.val >= targetVal[metric]
                        ? selectedMetric.color
                        : selectedMetric.color + '55'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-400 text-center mt-2">
              Solid = met target · Faded = below target
            </p>

            {/* weekly avg + best day */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Weekly Avg</p>
                <p className="font-extrabold text-gray-800 text-sm">
                  {Math.round(weeklyAvg[metric] || 0)}
                  <span className="text-xs font-normal text-gray-400 ml-0.5">{selectedMetric.unit}</span>
                </p>
                <p className="text-[10px] text-gray-400">{selectedMetric.label}/day</p>
              </div>
              {bestDayLabel && (
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-green-600 font-semibold uppercase mb-1">Best Day</p>
                  <p className="font-extrabold text-green-700 text-sm">{bestDayLabel}</p>
                  <p className="text-[10px] text-green-500">{bestScore}% of targets hit</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Daily targets summary */}
        {targets.daily_calories && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 text-sm mb-3">Your Daily Targets</h2>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Calories', value: targets.daily_calories, unit: 'kcal', color: 'bg-green-50  text-green-700'  },
                { label: 'Protein',  value: targets.protein_g,      unit: 'g',    color: 'bg-blue-50   text-blue-700'   },
                { label: 'Carbs',    value: targets.carbs_g,        unit: 'g',    color: 'bg-yellow-50 text-yellow-700' },
                { label: 'Fat',      value: targets.fat_g,          unit: 'g',    color: 'bg-red-50    text-red-700'    },
              ].map(n => (
                <div key={n.label} className={`${n.color} rounded-xl p-3 text-center`}>
                  <p className="font-extrabold text-sm">{n.value}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{n.label}<br/>{n.unit}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
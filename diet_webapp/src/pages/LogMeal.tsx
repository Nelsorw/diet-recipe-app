import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTodayLogs, deleteLog, getProfile } from '../services/api'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎'
}

const DATE_TABS = [
  { label: 'Today',     offset: 0 },
  { label: 'Yesterday', offset: 1 },
  { label: '2 days ago',offset: 2 },
  { label: '3 days ago',offset: 3 },
  { label: '4 days ago',offset: 4 },
  { label: '5 days ago',offset: 5 },
  { label: '6 days ago',offset: 6 },
]

function getDateByOffset(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d.toISOString().split('T')[0]
}

function NutritionBar({ label, consumed, target, color }: any) {
  const pct  = target ? Math.min((consumed / target) * 100, 100) : 0
  const over = target && consumed > target
  const left = Math.max(target - consumed, 0)
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-semibold text-gray-600">{label}</span>
        <span className={over ? 'text-red-500 font-bold' : 'text-gray-400'}>
          {over ? `+${Math.round(consumed - target)} over` : `${Math.round(left)} left`}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-0.5">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{Math.round(consumed)} consumed</span>
        <span>{Math.round(target)} target</span>
      </div>
    </div>
  )
}

export default function LogMeal() {
  const navigate                          = useNavigate()
  const [logs, setLogs]                   = useState<any[]>([])
  const [totals, setTotals]               = useState<any>(null)
  const [targets, setTargets]             = useState<any>(null)
  const [loading, setLoading]             = useState(true)
  const [selectedOffset, setSelectedOffset] = useState(0)
  const [deleting, setDeleting]           = useState<number | null>(null)

  const selectedDate = getDateByOffset(selectedOffset)
  const isToday      = selectedOffset === 0

  const fetchLogs = async (offset: number) => {
    setLoading(true)
    try {
      const dateStr = getDateByOffset(offset)
      const [logsRes, profileRes] = await Promise.all([
        // reuse getTodayLogs but pass date param
        fetch(`http://127.0.0.1:5000/log/by-date?date=${dateStr}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json()),
        getProfile()
      ])
      setLogs(logsRes.logs || [])
      setTotals(logsRes.totals || null)
      setTargets(profileRes.data.daily_targets || null)
    } catch (_) {} finally { setLoading(false) }
  }

  useEffect(() => { fetchLogs(selectedOffset) }, [selectedOffset])

  const handleDelete = async (id: number) => {
    setDeleting(id)
    try {
      await deleteLog(id)
      fetchLogs(selectedOffset)
    } catch (_) {} finally { setDeleting(null) }
  }

  // meal type coverage
  const loggedTypes  = new Set(logs.map(l => l.meal_type?.toLowerCase()))
  const totalCalories = totals?.calories || 0
  const totalProtein  = totals?.protein  || 0
  const totalCarbs    = totals?.carbs    || 0
  const totalFat      = totals?.fat      || 0

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="bg-primary-600 px-4 pt-6 pb-5">
        <h1 className="text-white text-xl font-bold">✏️ Meal Log</h1>
        <p className="text-primary-100 text-xs mt-1">Track your daily meals</p>
      </div>

      <div className="p-4 space-y-4">

        {/* Date tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {DATE_TABS.map(({ label, offset }) => {
            const d      = new Date(getDateByOffset(offset))
            const isSel  = offset === selectedOffset
            return (
              <button
                key={offset}
                onClick={() => setSelectedOffset(offset)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border transition-all ${
                  isSel
                    ? 'bg-primary-600 border-primary-600'
                    : 'bg-white border-gray-100 hover:border-primary-300'
                }`}
              >
                <span className={`text-[10px] font-semibold ${isSel ? 'text-primary-200' : 'text-gray-400'}`}>
                  {label === 'Today' || label === 'Yesterday' ? label : d.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className={`text-sm font-extrabold ${isSel ? 'text-white' : 'text-gray-700'}`}>
                  {d.getDate()}
                </span>
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Meal type coverage — today only */}
            {isToday && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="font-bold text-gray-800 text-sm mb-3">Today's Coverage</p>
                <div className="grid grid-cols-4 gap-2">
                  {MEAL_TYPES.map(type => {
                    const done = loggedTypes.has(type)
                    return (
                      <div
                        key={type}
                        className={`flex flex-col items-center py-2.5 rounded-xl border transition-all ${
                          done
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-100'
                        }`}
                      >
                        <span className="text-xl">{MEAL_ICONS[type]}</span>
                        <span className={`text-[10px] font-bold mt-1 capitalize ${done ? 'text-green-600' : 'text-gray-400'}`}>
                          {type}
                        </span>
                        <span className="text-[10px]">{done ? '✅' : '⬜'}</span>
                      </div>
                    )
                  })}
                </div>
                {/* shortcut */}
                {loggedTypes.size < 4 && (
                  <button
                    onClick={() => navigate('/')}
                    className="w-full mt-3 border border-primary-200 text-primary-600 font-bold text-xs py-2.5 rounded-xl hover:bg-primary-50 transition-colors"
                  >
                    ➕ Find a recipe to log
                  </button>
                )}
              </div>
            )}

            {/* Nutrition progress vs targets — today only */}
            {isToday && targets && totals && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                <p className="font-bold text-gray-800 text-sm">Today's Nutrition Progress</p>
                <NutritionBar label="Calories" consumed={totalCalories} target={targets.daily_calories} color="bg-orange-400" />
                <NutritionBar label="Protein"  consumed={totalProtein}  target={targets.protein_g}      color="bg-blue-400" />
                <NutritionBar label="Carbs"    consumed={totalCarbs}    target={targets.carbs_g}        color="bg-yellow-400" />
                <NutritionBar label="Fat"      consumed={totalFat}      target={targets.fat_g}          color="bg-red-400" />
              </div>
            )}

            {/* Totals summary */}
            {totals && (
              <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4">
                <p className="text-primary-700 font-bold text-sm mb-3">
                  {isToday ? "Today's Totals" : `Totals for ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Calories', value: `${Math.round(totalCalories)}` },
                    { label: 'Protein',  value: `${totalProtein.toFixed(1)}g` },
                    { label: 'Carbs',    value: `${totalCarbs.toFixed(1)}g` },
                    { label: 'Fat',      value: `${totalFat.toFixed(1)}g` },
                  ].map(n => (
                    <div key={n.label} className="text-center">
                      <p className="text-primary-700 font-extrabold text-sm">{n.value}</p>
                      <p className="text-primary-400 text-[10px]">{n.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Logs list */}
            <div>
              <p className="font-bold text-gray-700 text-sm mb-3">
                {isToday ? "Today's Meals" : `Meals on ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`}
              </p>
              {logs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <p className="text-3xl mb-2">🍽</p>
                  <p className="text-gray-400 text-sm">No meals logged {isToday ? 'today' : 'on this day'}.</p>
                  {isToday && (
                    <button
                      onClick={() => navigate('/')}
                      className="mt-3 text-primary-600 font-bold text-xs underline"
                    >
                      Browse recipes →
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log: any) => (
                    <div key={log.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
                      <span className="text-xl flex-shrink-0">{MEAL_ICONS[log.meal_type] || '🍽'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{log.recipe_name}</p>
                        <p className="text-xs text-gray-400 capitalize mt-0.5">
                          {log.meal_type} • 🔥 {Math.round(log.calories)} kcal • 💪 {log.protein?.toFixed(1)}g • 🌾 {log.carbs?.toFixed(1)}g
                        </p>
                      </div>
                      {isToday && (
                        <button
                          onClick={() => handleDelete(log.id)}
                          disabled={deleting === log.id}
                          className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                        >
                          {deleting === log.id
                            ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                            : '🗑'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
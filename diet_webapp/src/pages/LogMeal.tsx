import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteLog, getProfile, getLogsByDate } from '../services/api'
import { useAuth } from '../context/AuthContext'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_ICONS: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' }
const MEAL_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-50 border-amber-100',
  lunch    : 'bg-blue-50 border-blue-100',
  dinner   : 'bg-indigo-50 border-indigo-100',
  snack    : 'bg-green-50 border-green-100',
}

const DATE_TABS = Array.from({ length: 7 }, (_, i) => ({ offset: i }))

function getDateByOffset(offset: number) {
  const d = new Date(); d.setDate(d.getDate() - offset)
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
        <div className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{Math.round(consumed)} consumed</span>
        <span>{Math.round(target)} target</span>
      </div>
    </div>
  )
}

export default function LogMeal() {
  const navigate        = useNavigate()
  const { user }        = useAuth()
  const activeProfileId = user?.active_profile_id

  const [logs, setLogs]                     = useState<any[]>([])
  const [totals, setTotals]                 = useState<any>(null)
  const [targets, setTargets]               = useState<any>(null)
  const [loading, setLoading]               = useState(true)
  const [selectedOffset, setSelectedOffset] = useState(0)
  const [confirmDelete, setConfirmDelete]   = useState<any>(null)
  const [deleting, setDeleting]             = useState(false)

  const selectedDate = getDateByOffset(selectedOffset)
  const isToday      = selectedOffset === 0

  const fetchLogs = async (offset: number) => {
    setLoading(true)
    try {
      const dateStr = getDateByOffset(offset)
      const [logsRes, profileRes] = await Promise.all([
        getLogsByDate(dateStr).then(r => r.data),
        getProfile()
      ])
      setLogs(logsRes.logs || [])
      setTotals(logsRes.totals || null)
      setTargets(profileRes.data.daily_targets || null)
    } catch (_) {} finally { setLoading(false) }
  }

  useEffect(() => { fetchLogs(selectedOffset) }, [selectedOffset, activeProfileId])

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteLog(confirmDelete.id)
      setConfirmDelete(null)
      fetchLogs(selectedOffset)
    } catch (_) {} finally { setDeleting(false) }
  }

  const loggedTypes   = new Set(logs.map(l => l.meal_type?.toLowerCase()))
  const totalCalories = totals?.calories || 0
  const totalProtein  = totals?.protein  || 0
  const totalCarbs    = totals?.carbs    || 0
  const totalFat      = totals?.fat      || 0

  return (
    <div className="max-w-2xl mx-auto pb-8">

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">🗑</div>
            <h3 className="text-base font-bold text-center text-gray-800 mb-1">Remove meal log?</h3>
            <p className="text-sm text-gray-500 text-center mb-1">
              <span className="font-semibold text-gray-700">{confirmDelete.recipe_name}</span>
            </p>
            <p className="text-xs text-gray-400 text-center mb-5">This will remove it from your diary. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-gray-200 text-gray-500 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleDeleteConfirmed} disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm">
                {deleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-primary-600 px-4 pt-6 pb-5">
        <h1 className="text-white text-xl font-extrabold">Food Diary</h1>
        <p className="text-primary-200 text-xs mt-0.5">Track your daily nutrition</p>
      </div>

      <div className="p-4 space-y-4">

        {/* Date strip */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {DATE_TABS.map(({ offset }) => {
            const d      = new Date(getDateByOffset(offset))
            const isSel  = offset === selectedOffset
            const isToday = offset === 0
            return (
              <button key={offset} onClick={() => setSelectedOffset(offset)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-2xl border transition-all min-w-[52px] ${
                  isSel ? 'bg-primary-600 border-primary-600 shadow-sm'
                    : isToday ? 'bg-primary-50 border-primary-200'
                    : 'bg-white border-gray-100 hover:border-primary-200'
                }`}>
                <span className={`text-[10px] font-semibold ${isSel ? 'text-primary-200' : 'text-gray-400'}`}>
                  {offset === 0 ? 'Today' : offset === 1 ? 'Yest.' : d.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className={`text-sm font-extrabold mt-0.5 ${isSel ? 'text-white' : isToday ? 'text-primary-600' : 'text-gray-700'}`}>
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
            {/* Coverage grid — today only */}
            {isToday && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="font-bold text-gray-800 text-sm mb-3">Today's Coverage</p>
                <div className="grid grid-cols-4 gap-2">
                  {MEAL_TYPES.map(type => {
                    const done = loggedTypes.has(type)
                    return (
                      <div key={type} className={`flex flex-col items-center py-3 rounded-xl border transition-all ${
                        done ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'
                      }`}>
                        <span className="text-xl">{MEAL_ICONS[type]}</span>
                        <span className={`text-[10px] font-bold mt-1 capitalize ${done ? 'text-green-600' : 'text-gray-400'}`}>
                          {type}
                        </span>
                        <span className="text-[10px] mt-0.5">{done ? '✅' : '⬜'}</span>
                      </div>
                    )
                  })}
                </div>
                {loggedTypes.size < 4 && (
                  <button onClick={() => navigate('/')}
                    className="w-full mt-3 border border-primary-200 text-primary-600 font-bold text-xs py-2.5 rounded-xl hover:bg-primary-50 transition-colors">
                    ➕ Find a recipe to log
                  </button>
                )}
              </div>
            )}

            {/* Nutrition progress — today only */}
            {isToday && targets && totals && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                <p className="font-bold text-gray-800 text-sm">Nutrition Progress</p>
                <NutritionBar label="Calories" consumed={totalCalories} target={targets.daily_calories} color="bg-orange-400" />
                <NutritionBar label="Protein"  consumed={totalProtein}  target={targets.protein_g}      color="bg-blue-400" />
                <NutritionBar label="Carbs"    consumed={totalCarbs}    target={targets.carbs_g}        color="bg-yellow-400" />
                <NutritionBar label="Fat"      consumed={totalFat}      target={targets.fat_g}          color="bg-red-400" />
              </div>
            )}

            {/* Totals */}
            {totals && (
              <div className="bg-primary-600 rounded-2xl p-4">
                <p className="text-primary-100 font-semibold text-xs mb-3">
                  {isToday ? "Today's Totals" : new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Cal',     value: Math.round(totalCalories) },
                    { label: 'Protein', value: `${totalProtein.toFixed(1)}g` },
                    { label: 'Carbs',   value: `${totalCarbs.toFixed(1)}g` },
                    { label: 'Fat',     value: `${totalFat.toFixed(1)}g` },
                  ].map(n => (
                    <div key={n.label} className="text-center bg-white/15 rounded-xl py-2">
                      <p className="text-white font-extrabold text-sm">{n.value}</p>
                      <p className="text-primary-200 text-[10px]">{n.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Logs list */}
            <div>
              <p className="font-bold text-gray-700 text-sm mb-3">
                {isToday ? "Today's Meals" : `Meals · ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`}
              </p>
              {logs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <p className="text-3xl mb-2">🍽</p>
                  <p className="text-gray-400 text-sm">No meals logged {isToday ? 'today' : 'on this day'}.</p>
                  {isToday && (
                    <button onClick={() => navigate('/')} className="mt-3 text-primary-600 font-bold text-xs underline">
                      Browse recipes →
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log: any) => {
                    const mealColor = MEAL_COLORS[log.meal_type?.toLowerCase()] || 'bg-gray-50 border-gray-100'
                    return (
                      <div key={log.id} className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${mealColor}`}>
                        <span className="text-2xl flex-shrink-0">{MEAL_ICONS[log.meal_type] || '🍽'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate capitalize">{log.recipe_name}</p>
                          <p className="text-xs text-gray-500 capitalize mt-0.5">
                            {log.meal_type} · 🔥 {Math.round(log.calories)} kcal · 💪 {log.protein?.toFixed(1)}g · 🌾 {log.carbs?.toFixed(1)}g
                          </p>
                        </div>
                        <button
                          onClick={() => setConfirmDelete(log)}
                          className="flex-shrink-0 w-8 h-8 rounded-full bg-white/70 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

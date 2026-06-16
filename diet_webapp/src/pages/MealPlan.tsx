import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDailyMealPlan, getWeeklyMealPlan, generateMealPlan, regenerateDayPlan, logMeal, getTodayLogs } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline'

const MEAL_ICONS: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' }
const MEAL_TIMES: Record<string, string> = { breakfast: '8:00 AM', lunch: '1:00 PM', dinner: '7:00 PM', snack: '3:00 PM' }
const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FULL_DAYS  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'

// Always use local date (not UTC) to avoid timezone off-by-one issues
function localDateStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function NutritionBar({ label, value, target, color }: any) {
  const pct = target ? Math.min((value / target) * 100, 100) : 0
  const over = target && value > target * 1.1
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className={over ? 'text-red-500 font-bold' : 'text-gray-400'}>
          {Math.round(value)} / {Math.round(target)}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function MealCard({ meal, onNavigate, onLog, isLogged, isLogging }: {
  meal: any; onNavigate: () => void; onLog: () => void; isLogged: boolean; isLogging: boolean
}) {
  const [imgErr, setImgErr] = useState(false)
  const imgSrc = imgErr || !meal.image_url ? DEFAULT_IMG : meal.image_url
  const todayStr = new Date().toISOString().split('T')[0]
  const isToday  = meal.plan_date === todayStr || !meal.plan_date

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* clickable image + info area */}
      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors active:scale-[0.99]"
        onClick={onNavigate}>
        <div className="relative flex-shrink-0">
          <img src={imgSrc} alt={meal.recipe_name} onError={() => setImgErr(true)}
            className="w-20 h-20 rounded-xl object-cover" />
          <span className="absolute -top-1.5 -left-1.5 text-base">{MEAL_ICONS[meal.meal_type] || '🍽'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">
            {meal.meal_type} · {MEAL_TIMES[meal.meal_type] || ''}
          </p>
          <p className="text-sm font-bold text-gray-800 leading-snug line-clamp-2">{meal.recipe_name}</p>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-1.5 py-0.5 rounded-md">
              🔥 {Math.round(meal.calories)} kcal
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded-md">
              P {meal.protein?.toFixed(1)}g
            </span>
            <span className="text-[10px] bg-yellow-50 text-yellow-600 font-bold px-1.5 py-0.5 rounded-md">
              C {meal.carbs?.toFixed(1)}g
            </span>
          </div>
        </div>
        <span className="text-gray-200 text-lg flex-shrink-0">›</span>
      </div>

      {/* log button — only for today */}
      {isToday && (
        <div className="border-t border-gray-50 px-3 py-2">
          <button
            onClick={onLog}
            disabled={isLogged || isLogging}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              isLogged
                ? 'bg-green-50 text-green-600 cursor-default border border-green-100'
                : isLogging
                ? 'bg-gray-50 text-gray-400 cursor-wait'
                : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-100 active:scale-95'
            }`}
          >
            {isLogging
              ? <><div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" /> Logging...</>
              : isLogged
              ? <><CheckIcon className="w-3.5 h-3.5" /> Logged to Diary</>
              : '✏️ Log This Meal'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function MealPlan() {
  const navigate        = useNavigate()
  const { user }        = useAuth()
  const activeProfileId = user?.active_profile_id

  const [weeklyPlan, setWeeklyPlan]         = useState<Record<string, any>>({})
  const [selectedDate, setSelectedDate]     = useState(new Date().toISOString().split('T')[0])
  const [targets, setTargets]               = useState<any>(null)
  const [loading, setLoading]               = useState(true)
  const [generating, setGenerating]         = useState(false)
  const [regenDay, setRegenDay]             = useState<string | null>(null)
  const [loggedMeals, setLoggedMeals]       = useState<Set<string>>(new Set())
  const [loggingMeal, setLoggingMeal]       = useState<string | null>(null)
  const [planMode, setPlanMode]             = useState<'daily' | 'weekly'>('weekly')

  const todayStr  = localDateStr()
  const weekDates = Object.keys(weeklyPlan).length > 0
    ? Object.keys(weeklyPlan).sort()
    : Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() + i)
        return localDateStr(d)
      })

  const fetchWeekly = async () => {
    try {
      const res  = await getWeeklyMealPlan()
      const plan = res.data.weekly_plan || {}
      setWeeklyPlan(plan)
      setTargets(res.data.daily_targets || null)
    } catch (_) {} finally { setLoading(false) }
  }

  const fetchTodayLogs = async () => {
    try {
      const res  = await getTodayLogs()
      const logs = res.data.logs || []
      setLoggedMeals(new Set(logs.map((l: any) => l.meal_type?.toLowerCase())))
    } catch (_) {}
  }

  useEffect(() => {
    setLoading(true); setWeeklyPlan({})
    setSelectedDate(localDateStr())
    fetchWeekly()
    fetchTodayLogs()
  }, [activeProfileId])

  const handleLogMeal = async (meal: any) => {
    const key = meal.meal_type?.toLowerCase()
    setLoggingMeal(key)
    try {
      await logMeal({
        recipe_name: meal.recipe_name,
        meal_type  : meal.meal_type || 'dinner',
        calories   : meal.calories  || 0,
        protein    : meal.protein   || 0,
        carbs      : meal.carbs     || 0,
        fat        : meal.fat       || 0,
      })
      setLoggedMeals(prev => new Set([...prev, key]))
    } catch (_) {} finally { setLoggingMeal(null) }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await generateMealPlan(planMode)
      if (planMode === 'daily') {
        // daily returns a single day — wrap it in weekly format
        const today = localDateStr()
        setWeeklyPlan(prev => ({
          ...prev,
          [today]: {
            meals     : res.data.meal_plan || [],
            day_totals: res.data.day_totals || {}
          }
        }))
        setSelectedDate(today)
      } else {
        setWeeklyPlan(res.data.weekly_plan || {})
      }
      setTargets(res.data.daily_targets || null)
    } catch (_) {} finally { setGenerating(false) }
  }

  const handleRegenerateDay = async (dateStr: string) => {
    setRegenDay(dateStr)
    try {
      const res = await regenerateDayPlan(dateStr)
      setWeeklyPlan(prev => ({ ...prev, [dateStr]: { meals: res.data.meal_plan, day_totals: res.data.day_totals } }))
    } catch (_) {} finally { setRegenDay(null) }
  }

  const selectedDay   = weeklyPlan[selectedDate]
  const selectedMeals = selectedDay?.meals || []
  const dayTotals     = selectedDay?.day_totals || {}

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto pb-8">

      {/* Header */}
      <div className="bg-primary-600 px-4 pt-6 pb-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-white text-xl font-extrabold">Meal Plan</h1>
            <p className="text-primary-200 text-xs mt-0.5">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* Plan type selector + Generate */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Generate Meal Plan</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPlanMode('daily')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                planMode === 'daily'
                  ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-primary-300'
              }`}
            >
              Today Only
            </button>
            <button
              onClick={() => setPlanMode('weekly')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                planMode === 'weekly'
                  ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-primary-300'
              }`}
            >
              Full Week
            </button>
          </div>
          <button onClick={handleGenerate} disabled={generating}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
            {generating
              ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating{planMode === 'daily' ? ' today...' : ' your week...'}</>
              : planMode === 'daily' ? 'Generate Today\'s Plan' : 'Generate Plan'}
          </button>
          <p className="text-[10px] text-gray-400 text-center">
            {planMode === 'daily'
              ? 'Creates a plan for today only.'
              : 'Creates a full 7-day plan.'}
          </p>
        </div>

        {Object.keys(weeklyPlan).length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🥗</span>
            </div>
            <p className="text-gray-700 font-bold mb-1">No meal plan yet</p>
            <p className="text-gray-400 text-sm">Choose Today Only or Full Week above, then tap Generate.</p>
          </div>
        ) : (
          <>
            {/* Week strip */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {weekDates.map(dateStr => {
                const d       = new Date(dateStr)
                const hasplan = !!weeklyPlan[dateStr]
                const isToday = dateStr === todayStr
                const isSel   = dateStr === selectedDate
                return (
                  <button key={dateStr} onClick={() => setSelectedDate(dateStr)}
                    className={`flex-shrink-0 flex flex-col items-center w-12 py-2.5 rounded-2xl transition-all border ${
                      isSel ? 'bg-primary-600 border-primary-600 shadow-md'
                        : isToday ? 'bg-primary-50 border-primary-200'
                        : 'bg-white border-gray-100'
                    }`}>
                    <span className={`text-[10px] font-semibold ${isSel ? 'text-primary-200' : 'text-gray-400'}`}>
                      {DAY_NAMES[d.getDay()]}
                    </span>
                    <span className={`text-base font-extrabold mt-0.5 ${isSel ? 'text-white' : isToday ? 'text-primary-600' : 'text-gray-700'}`}>
                      {d.getDate()}
                    </span>
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 ${hasplan ? (isSel ? 'bg-white' : 'bg-primary-400') : 'bg-transparent'}`} />
                  </button>
                )
              })}
            </div>

            {/* Day header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-extrabold text-gray-800 text-base">
                  {FULL_DAYS[new Date(selectedDate).getDay()]}
                  {selectedDate === todayStr && (
                    <span className="ml-2 text-xs bg-primary-100 text-primary-600 font-bold px-2 py-0.5 rounded-full">Today</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => handleRegenerateDay(selectedDate)} disabled={regenDay === selectedDate}
                className="flex items-center gap-1.5 text-xs border border-primary-200 text-primary-600 font-bold px-3 py-2 rounded-xl hover:bg-primary-50 transition-colors disabled:opacity-50">
                {regenDay === selectedDate
                  ? <><div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" /> Regenerating</>
                  : <><ArrowPathIcon className="w-3.5 h-3.5" /> Redo Day</>}
              </button>
            </div>

            {/* Meals */}
            {selectedMeals.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-400 text-sm">No meals planned for this day.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedMeals.map((meal: any, i: number) => (
                  <MealCard
                    key={i}
                    meal={{ ...meal, plan_date: selectedDate }}
                    onNavigate={() => meal.recipe_id && navigate(`/recipe/${meal.recipe_id}`)}
                    onLog={() => handleLogMeal(meal)}
                    isLogged={loggedMeals.has(meal.meal_type?.toLowerCase())}
                    isLogging={loggingMeal === meal.meal_type?.toLowerCase()}
                  />
                ))}
              </div>
            )}

            {/* Nutrition summary */}
            {targets && selectedMeals.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-gray-800 text-sm">Daily Nutrition</p>
                  <span className="text-xs text-gray-400">vs targets</span>
                </div>
                <div className="space-y-2.5">
                  <NutritionBar label="Calories" value={dayTotals.calories || 0} target={targets.daily_calories} color="bg-orange-400" />
                  <NutritionBar label="Protein"  value={dayTotals.protein  || 0} target={targets.protein_g}      color="bg-blue-400" />
                  <NutritionBar label="Carbs"    value={dayTotals.carbs    || 0} target={targets.carbs_g}        color="bg-yellow-400" />
                  <NutritionBar label="Fat"      value={dayTotals.fat      || 0} target={targets.fat_g}          color="bg-red-400" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

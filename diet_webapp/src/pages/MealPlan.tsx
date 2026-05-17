import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDailyMealPlan, getWeeklyMealPlan, generateMealPlan, regenerateDayPlan } from '../services/api'
import { useAuth } from '../context/AuthContext'

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎'
}
const MEAL_TIMES: Record<string, string> = {
  breakfast: '8:00 AM', lunch: '1:00 PM', dinner: '7:00 PM'
}
const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FULL_DAYS  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'

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
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function MealCard({ meal, onClick }: { meal: any; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false)
  const imgSrc = imgErr || !meal.image_url ? DEFAULT_IMG : meal.image_url

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer active:scale-95"
    >
      {/* image */}
      <div className="relative flex-shrink-0">
        <img
          src={imgSrc}
          alt={meal.recipe_name}
          onError={() => setImgErr(true)}
          className="w-20 h-20 rounded-xl object-cover"
        />
        <span className="absolute -top-1.5 -left-1.5 text-lg">{MEAL_ICONS[meal.meal_type] || '🍽'}</span>
      </div>

      {/* info */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
          {meal.meal_type} · {MEAL_TIMES[meal.meal_type] || ''}
        </p>
        <p className="text-sm font-bold text-gray-800 leading-snug mt-0.5 line-clamp-2">
          {meal.recipe_name}
        </p>
        <div className="flex gap-2 mt-1.5">
          <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-1.5 py-0.5 rounded-md">
            🔥 {Math.round(meal.calories)} kcal
          </span>
          <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded-md">
            💪 {meal.protein?.toFixed(1)}g
          </span>
          <span className="text-[10px] bg-yellow-50 text-yellow-600 font-bold px-1.5 py-0.5 rounded-md">
            🌾 {meal.carbs?.toFixed(1)}g
          </span>
        </div>
      </div>

      <span className="text-gray-300 text-lg flex-shrink-0">›</span>
    </div>
  )
}

export default function MealPlan() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const activeProfileId = user?.active_profile_id

  const [weeklyPlan, setWeeklyPlan]     = useState<Record<string, any>>({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [targets, setTargets]           = useState<any>(null)
  const [loading, setLoading]           = useState(true)
  const [generating, setGenerating]     = useState(false)
  const [regenDay, setRegenDay]         = useState<string | null>(null)
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [showNotifModal, setShowNotifModal] = useState(false)

  // Build the week strip from whatever dates exist in the plan,
  // falling back to today+6 if no plan yet
  const weekDates = Object.keys(weeklyPlan).length > 0
    ? Object.keys(weeklyPlan).sort()
    : Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() + i)
        return d.toISOString().split('T')[0]
      })

  const fetchWeekly = async () => {
    try {
      const res = await getWeeklyMealPlan()
      const plan = res.data.weekly_plan || {}
      setWeeklyPlan(plan)
      setTargets(res.data.daily_targets || null)
      // select today if it's in the plan, otherwise the first available date
      const todayStr = new Date().toISOString().split('T')[0]
      const dates    = Object.keys(plan).sort()
      if (dates.length > 0 && !plan[todayStr]) {
        setSelectedDate(dates[0])
      }
    } catch (_) {} finally { setLoading(false) }
  }

  useEffect(() => {
    setLoading(true)
    setWeeklyPlan({})
    setSelectedDate(new Date().toISOString().split('T')[0])
    fetchWeekly()
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotifEnabled(true)
    }
  }, [activeProfileId])

  const scheduleMealReminders = (meals: any[]) => {
    const mealTimes = [
      { type: 'breakfast', hour: 8,  minute: 0 },
      { type: 'lunch',     hour: 13, minute: 0 },
      { type: 'dinner',    hour: 19, minute: 0 },
    ]
    mealTimes.forEach(({ type, hour, minute }) => {
      const meal = meals.find(m => m.meal_type === type)
      if (!meal) return
      const now    = new Date()
      const target = new Date()
      target.setHours(hour - 2, minute, 0, 0)
      const diff = target.getTime() - now.getTime()
      if (diff > 0) {
        setTimeout(() => {
          new Notification(`${MEAL_ICONS[type]} ${type.charAt(0).toUpperCase() + type.slice(1)} in 2 hours!`, {
            body: [
              `🍽 ${meal.recipe_name}`,
              `🔥 ${Math.round(meal.calories)} kcal`,
              `💪 Protein: ${meal.protein?.toFixed(1)}g`,
              `🌾 Carbs: ${meal.carbs?.toFixed(1)}g`,
              `🧈 Fat: ${meal.fat?.toFixed(1)}g`,
            ].join('\n'),
            icon: '/favicon.ico'
          })
        }, diff)
      }
    })
  }

  const handleToggleNotif = async () => {
    if (notifEnabled) {
      // show modal to confirm turning off
      setShowNotifModal(true)
      return
    }
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      setNotifEnabled(true)
      const todayStr   = new Date().toISOString().split('T')[0]
      const todayMeals = weeklyPlan[todayStr]?.meals || []
      scheduleMealReminders(todayMeals)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res        = await generateMealPlan()
      const todayStr   = new Date().toISOString().split('T')[0]
      const todayMeals = res.data.weekly_plan?.[todayStr]?.meals || []
      setWeeklyPlan(res.data.weekly_plan || {})
      setTargets(res.data.daily_targets || null)
      if (notifEnabled) scheduleMealReminders(todayMeals)
    } catch (_) {} finally { setGenerating(false) }
  }

  const handleRegenerateDay = async (dateStr: string) => {
    setRegenDay(dateStr)
    try {
      const res = await regenerateDayPlan(dateStr)
      setWeeklyPlan(prev => ({
        ...prev,
        [dateStr]: {
          meals     : res.data.meal_plan,
          day_totals: res.data.day_totals
        }
      }))
    } catch (_) {} finally { setRegenDay(null) }
  }

  const selectedDay   = weeklyPlan[selectedDate]
  const selectedMeals = selectedDay?.meals || []
  const dayTotals     = selectedDay?.day_totals || {}
  const todayStr      = new Date().toISOString().split('T')[0]

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto pb-8">

      {/* Notification off confirm modal */}
      {showNotifModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 bg-yellow-50 rounded-full flex items-center justify-center text-3xl">🔔</div>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-800 mb-2">Turn off reminders?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">You won't receive meal time notifications anymore.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNotifModal(false)}
                className="flex-1 border border-gray-200 text-gray-500 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Keep On
              </button>
              <button
                onClick={() => { setNotifEnabled(false); setShowNotifModal(false) }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
              >
                Turn Off
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-primary-600 px-4 pt-6 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">📅 Meal Plan</h1>
            <p className="text-primary-100 text-xs mt-0.5">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          {/* notification toggle */}
          <button
            onClick={handleToggleNotif}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              notifEnabled
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-white/10 text-primary-100 border border-white/20 hover:bg-white/20'
            }`}
          >
            {notifEnabled ? '🔔 On' : '🔕 Off'}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* Generate button */}
        <button
          onClick={handleGenerate} disabled={generating}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl transition-colors shadow-md flex items-center justify-center gap-2"
        >
          {generating
            ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating your week...</>
            : '✨ Generate Weekly Plan'}
        </button>

        {Object.keys(weeklyPlan).length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🥗</span>
            </div>
            <p className="text-gray-700 font-bold mb-1">No meal plan yet</p>
            <p className="text-gray-400 text-sm">Tap Generate to create your personalized weekly plan.</p>
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
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex-shrink-0 flex flex-col items-center w-12 py-2.5 rounded-2xl transition-all border ${
                      isSel
                        ? 'bg-primary-600 border-primary-600 shadow-md'
                        : isToday
                        ? 'bg-primary-50 border-primary-200'
                        : 'bg-white border-gray-100'
                    }`}
                  >
                    <span className={`text-[10px] font-semibold ${isSel ? 'text-primary-200' : 'text-gray-400'}`}>
                      {DAY_NAMES[d.getDay()]}
                    </span>
                    <span className={`text-base font-extrabold mt-0.5 ${isSel ? 'text-white' : isToday ? 'text-primary-600' : 'text-gray-700'}`}>
                      {d.getDate()}
                    </span>
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      hasplan ? (isSel ? 'bg-white' : 'bg-primary-400') : 'bg-transparent'
                    }`} />
                  </button>
                )
              })}
            </div>

            {/* Selected day label + redo */}
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
              <button
                onClick={() => handleRegenerateDay(selectedDate)}
                disabled={regenDay === selectedDate}
                className="flex items-center gap-1.5 text-xs border border-primary-200 text-primary-600 font-bold px-3 py-2 rounded-xl hover:bg-primary-50 transition-colors disabled:opacity-50"
              >
                {regenDay === selectedDate
                  ? <><div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" /> Regenerating</>
                  : '🔄 Redo Day'}
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
                    meal={meal}
                    onClick={() => meal.recipe_id && navigate(`/recipe/${meal.recipe_id}`)}
                  />
                ))}
              </div>
            )}

            {/* Nutrition summary */}
            {targets && selectedMeals.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-gray-800 text-sm">Daily Nutrition</p>
                  <span className="text-xs text-gray-400">vs your targets</span>
                </div>
                <NutritionBar label="Calories" value={dayTotals.calories || 0} target={targets.daily_calories} color="bg-orange-400" />
                <NutritionBar label="Protein"  value={dayTotals.protein  || 0} target={targets.protein_g}      color="bg-blue-400" />
                <NutritionBar label="Carbs"    value={dayTotals.carbs    || 0} target={targets.carbs_g}        color="bg-yellow-400" />
                <NutritionBar label="Fat"      value={dayTotals.fat      || 0} target={targets.fat_g}          color="bg-red-400" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
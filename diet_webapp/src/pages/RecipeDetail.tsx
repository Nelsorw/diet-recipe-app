import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRecipeById, getDailyMealPlan, addRecipeToMealPlan, logMeal, getTodayLogs } from '../services/api'

const MEAL_IMAGES: Record<string, string> = {
  breakfast : 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800',
  lunch     : 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  dinner    : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
  snack     : 'https://images.unsplash.com/photo-1559181567-c3190ca9d222?w=800',
  dessert   : 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800',
  soup      : 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
}
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const parseList = (raw: string): string[] => {
  if (!raw) return []
  try {
    const cleaned = raw.replace(/'/g, '"')
    const parsed  = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : [raw]
  } catch {
    return raw.replace(/[\[\]']/g, '').split(',').map(s => s.trim()).filter(Boolean)
  }
}

// build next 7 days
const getWeekDates = () => Array.from({ length: 7 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() + i)
  return d.toISOString().split('T')[0]
})

function AddToPlanModal({ recipe, onClose, onSuccess }: any) {
  const [selectedDate, setSelectedDate]     = useState(new Date().toISOString().split('T')[0])
  const [conflict, setConflict]             = useState<any>(null)
  const [checkingConflict, setChecking]     = useState(false)
  const [saving, setSaving]                 = useState(false)
  const weekDates                           = getWeekDates()

  const checkConflict = async (dateStr: string) => {
    setSelectedDate(dateStr)
    setConflict(null)
    if (!recipe.meal_type) return
    setChecking(true)
    try {
      const res   = await getDailyMealPlan(dateStr)
      const plans = res.data.meal_plan || []
      const clash = plans.find((p: any) =>
        p.meal_type?.toLowerCase() === recipe.meal_type?.toLowerCase()
      )
      if (clash) setConflict(clash)
    } catch (_) {} finally { setChecking(false) }
  }

const handleAdd = async (replace = false) => {
  setSaving(true)
  try {
    await addRecipeToMealPlan({
      recipe_id : recipe.id,
      plan_date : selectedDate,
      replace
    })
    onSuccess(selectedDate)
  } catch (err: any) {
    if (err.response?.status === 409) {
      // backend found conflict that frontend missed — show it
      setConflict(err.response.data.existing)
    }
  } finally { setSaving(false) }
}

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-gray-800">📅 Add to Meal Plan</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
          <p className="text-xs text-gray-500 line-clamp-1">{recipe.name}</p>
          {recipe.meal_type && (
            <span className="inline-block mt-1.5 text-[10px] bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full capitalize">
              {recipe.meal_type}
            </span>
          )}
        </div>

        {/* day picker */}
        <div className="p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Choose a day</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {weekDates.map(dateStr => {
              const d       = new Date(dateStr)
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              const isSel   = dateStr === selectedDate
              return (
                <button
                  key={dateStr}
                  onClick={() => checkConflict(dateStr)}
                  className={`flex-shrink-0 flex flex-col items-center w-11 py-2 rounded-xl border transition-all ${
                    isSel
                      ? 'bg-primary-600 border-primary-600'
                      : 'bg-gray-50 border-gray-100 hover:border-primary-300'
                  }`}
                >
                  <span className={`text-[10px] font-semibold ${isSel ? 'text-primary-200' : 'text-gray-400'}`}>
                    {DAY_NAMES[d.getDay()]}
                  </span>
                  <span className={`text-sm font-extrabold ${isSel ? 'text-white' : isToday ? 'text-primary-600' : 'text-gray-700'}`}>
                    {d.getDate()}
                  </span>
                </button>
              )
            })}
          </div>

          {/* conflict warning */}
          {checkingConflict && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
              Checking plan...
            </div>
          )}
          {conflict && !checkingConflict && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 mb-0.5">⚠️ Conflict</p>
              <p className="text-xs text-amber-600">
                <span className="font-semibold capitalize">{conflict.meal_type}</span> is already planned:
                <span className="font-semibold"> "{conflict.recipe_name}"</span>
              </p>
              <p className="text-xs text-amber-500 mt-1">Do you want to replace it?</p>
            </div>
          )}
        </div>

        {/* actions */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-500 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            Cancel
          </button>
          {conflict ? (
            <button
              onClick={() => handleAdd(true)}
              disabled={saving}
              className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
            >
              {saving ? 'Replacing...' : '🔄 Replace'}
            </button>
          ) : (
            <button
              onClick={() => handleAdd(false)}
              disabled={saving || checkingConflict}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
            >
              {saving ? 'Adding...' : '✅ Add'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RecipeDetail() {
  const { id }                        = useParams()
  const navigate                      = useNavigate()
  const [recipe, setRecipe]           = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [imgError, setImgError]       = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [planSuccess, setPlanSuccess]     = useState<string | null>(null)
  const [isLogged, setIsLogged]           = useState(false)
  const [logging, setLogging]             = useState(false)
  const [logMessage, setLogMessage] = useState<string | null>(null)

const handleLogMeal = async () => {
  if (isLogged) return
  setLogging(true)
  try {
    const res = await logMeal({
      recipe_name : recipe.name,
      meal_type   : recipe.meal_type || 'dinner',
      calories    : recipe.calories  || 0,
      protein     : recipe.protein   || 0,
      carbs       : recipe.carbs     || 0,
      fat         : recipe.fat       || 0,
    })
    if (res.status === 201) {
      // genuinely new log
      setIsLogged(true)
      setLogMessage(null)
    } else {
      // duplicate — keep button as is, show warning
      setLogMessage(`You already logged ${recipe.meal_type || 'this meal type'} today. Delete it first to replace it.`)
    }
  } catch (_) {} finally { setLogging(false) }
}

useEffect(() => {
  const fetchRecipe = async () => {
    try {
      const recipeRes = await getRecipeById(Number(id))
      setRecipe(recipeRes.data)

      // fetch logs separately so recipe still loads even if logs fail
      try {
        const logsRes       = await getTodayLogs()
        const logs          = logsRes.data.logs || []
        const alreadyLogged = logs.some(
          (l: any) => l.recipe_name === recipeRes.data.name
        )
        if (alreadyLogged) setIsLogged(true)
      } catch (_) {}

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load recipe.')
    } finally { setLoading(false) }
  }
  if (id) fetchRecipe()
}, [id])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      <p className="text-gray-400 text-sm">Loading recipe...</p>
    </div>
  )

  if (error || !recipe) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
      <span className="text-5xl">😕</span>
      <p className="text-red-500 text-center">{error || 'Recipe not found.'}</p>
      <button onClick={() => navigate(-1)} className="bg-primary-600 text-white px-6 py-2 rounded-xl font-semibold">← Go Back</button>
    </div>
  )

  const ingredients = parseList(recipe.ingredients)
  const steps       = parseList(recipe.steps)
  const imgSrc      = imgError || !recipe.image
    ? (MEAL_IMAGES[recipe.meal_type?.toLowerCase()] || DEFAULT_IMG)
    : recipe.image

  const nutrients = [
    { label: 'Calories',      value: `${Math.round(recipe.calories || 0)}`,      unit: 'kcal', color: 'bg-green-50  text-green-700'  },
    { label: 'Protein',       value: `${(recipe.protein || 0).toFixed(1)}`,       unit: 'g',    color: 'bg-blue-50   text-blue-700'   },
    { label: 'Carbs',         value: `${(recipe.carbs || 0).toFixed(1)}`,         unit: 'g',    color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Fat',           value: `${(recipe.fat || 0).toFixed(1)}`,           unit: 'g',    color: 'bg-red-50    text-red-700'    },
    { label: 'Sugar',         value: `${(recipe.sugar || 0).toFixed(1)}`,         unit: 'g',    color: 'bg-pink-50   text-pink-700'   },
    { label: 'Sodium',        value: `${Math.round(recipe.sodium || 0)}`,         unit: 'mg',   color: 'bg-purple-50 text-purple-700' },
    { label: 'Saturated Fat', value: `${(recipe.saturated_fat || 0).toFixed(1)}`, unit: 'g',    color: 'bg-orange-50 text-orange-700' },
  ]

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {showPlanModal && (
        <AddToPlanModal
          recipe={recipe}
          onClose={() => setShowPlanModal(false)}
          onSuccess={(dateStr: string) => {
            setShowPlanModal(false)
            setPlanSuccess(dateStr)
          }}
        />
      )}

      {/* Hero Image */}
      <div className="relative">
        <img
          src={imgSrc} alt={recipe.name}
          onError={() => setImgError(true)}
          className="w-full h-64 sm:h-80 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-black/40 hover:bg-black/60 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
        >
          ←
        </button>
        <div className="absolute bottom-4 left-4 flex gap-2 flex-wrap">
          {recipe.meal_type && (
            <span className="bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full capitalize">
              {recipe.meal_type}
            </span>
          )}
          {recipe.dietary_attributes && recipe.dietary_attributes !== 'No Nutritional Focus' && (
            <span className="bg-emerald-800 text-white text-xs font-bold px-3 py-1 rounded-full">
              {recipe.dietary_attributes}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 leading-tight mb-3">
            {recipe.name || 'Untitled Recipe'}
          </h1>
          <div className="flex flex-wrap gap-2">
            {recipe.minutes > 0 && (
              <span className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full">
                ⏱ {recipe.minutes} min
              </span>
            )}
            {recipe.n_steps > 0 && (
              <span className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full">
                📋 {recipe.n_steps} steps
              </span>
            )}
            {recipe.n_ingredients > 0 && (
              <span className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full">
                🧂 {recipe.n_ingredients} ingredients
              </span>
            )}
          </div>
        </div>

        {/* Match score */}
        {recipe.suitability_score && (
          <div className="flex items-center gap-3 bg-primary-50 border border-primary-100 rounded-xl p-4">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="text-primary-700 font-bold text-base">{Math.round(recipe.suitability_score * 100)}% match</p>
              <p className="text-primary-500 text-xs">Suitable for your health profile</p>
            </div>
          </div>
        )}

        {/* Description */}
        {recipe.description?.trim() && (
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-2">📝 About</h2>
            <p className="text-gray-500 text-sm leading-relaxed">{recipe.description}</p>
          </div>
        )}

        {/* Nutrition */}
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-3">🥗 Nutrition per Serving</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {nutrients.map(n => (
              <div key={n.label} className={`${n.color} rounded-xl p-3 text-center`}>
                <p className="font-extrabold text-base">{n.value}<span className="text-xs font-normal ml-0.5">{n.unit}</span></p>
                <p className="text-xs opacity-70 mt-0.5">{n.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-3">🧂 Ingredients ({ingredients.length})</h2>
            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
              {ingredients.map((item, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-700 capitalize">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steps */}
        {steps.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-3">👨‍🍳 Preparation Steps</h2>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl p-4">
                  <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {logMessage && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2">
            <span>⚠️</span> {logMessage}
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Add to Meal Plan */}
          <button
            onClick={() => { if (!planSuccess) setShowPlanModal(true) }}
            className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 transition-all ${
              planSuccess
                ? 'bg-green-50 border-green-200 cursor-default'
                : 'bg-white border-primary-200 hover:bg-primary-50 hover:border-primary-400 active:scale-95'
            }`}
          >
            <span className="text-2xl">{planSuccess ? '✅' : '📅'}</span>
            <span className={`text-xs font-bold ${planSuccess ? 'text-green-600' : 'text-primary-700'}`}>
              {planSuccess
                ? `Added to ${new Date(planSuccess).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                : 'Add to Meal Plan'}
            </span>
          </button>

          {/* Log Meal */}
          <button
            onClick={handleLogMeal}
            disabled={logging || isLogged}
            className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 transition-all ${
              isLogged
                ? 'bg-blue-50 border-blue-200 cursor-default'
                : logging
                ? 'bg-gray-50 border-gray-200 opacity-60 cursor-wait'
                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-400 active:scale-95'
            }`}
          >
            <span className="text-2xl">
              {logging ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" /> : isLogged ? '📒' : '✏️'}
            </span>
            <span className={`text-xs font-bold ${isLogged ? 'text-blue-600' : 'text-gray-600'}`}>
              {isLogged ? 'Meal Logged ✓' : 'Log This Meal'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
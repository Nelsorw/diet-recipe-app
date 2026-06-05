import { useEffect, useState } from 'react'
import { getRecommendations } from '../services/api'
import { useAuth } from '../context/AuthContext'
import RecipeCard from '../components/RecipeCard'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

const FILTERS = [
  { key: 'All',       label: 'All',       icon: '✨' },
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'lunch',     label: 'Lunch',     icon: '☀️' },
  { key: 'dinner',    label: 'Dinner',    icon: '🌙' },
  { key: 'snack',     label: 'Snack',     icon: '🍎' },
]

function getCacheKeys(userId: number, profileId: number) {
  return {
    recipes : `cached_recommendations_${userId}_${profileId}`,
    targets : `cached_targets_${userId}_${profileId}`
  }
}

function round1(n: number) { return Math.round(n * 10) / 10 }

export default function Home() {
  const { user }                    = useAuth()
  const [allRecipes, setAllRecipes] = useState<any[]>([])
  const [targets, setTargets]       = useState<any>(null)
  const [loading, setLoading]       = useState(false)
  const [filter, setFilter]         = useState('All')

  const profileId = user?.active_profile_id || 0

  const fetchRecipes = async () => {
    if (!user?.id) return
    const { recipes: CACHE_KEY, targets: CACHE_TARGET } = getCacheKeys(user.id, profileId)
    setLoading(true)
    try {
      const res  = await getRecommendations({ top_n: 50 })
      const data = res.data.recommendations || []
      if (data.length > 0) {
        setAllRecipes(data)
        setTargets(res.data.user_targets)
        localStorage.setItem(CACHE_KEY,    JSON.stringify(data))
        localStorage.setItem(CACHE_TARGET, JSON.stringify(res.data.user_targets))
      }
    } catch (err: any) {
      console.error(err)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!user?.id) return
    const { recipes: CACHE_KEY, targets: CACHE_TARGET } = getCacheKeys(user.id, profileId)
    const cached        = localStorage.getItem(CACHE_KEY)
    const cachedTargets = localStorage.getItem(CACHE_TARGET)
    if (cached) {
      // load from cache instantly — no spinner, no API call
      setAllRecipes(JSON.parse(cached))
      setTargets(cachedTargets ? JSON.parse(cachedTargets) : null)
      setLoading(false)
    } else {
      fetchRecipes()
    }
  }, [user?.id, profileId])

  const recipes = filter === 'All'
    ? allRecipes
    : allRecipes.filter(r => r.meal_type?.toLowerCase() === filter.toLowerCase())

  return (
    <div className="max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="bg-primary-600 px-4 pt-6 pb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-white text-xl font-extrabold leading-tight">
              Recommended for You
            </h1>
            <p className="text-primary-200 text-xs mt-0.5">
              Personalised to your health profile
            </p>
          </div>
          <button
            onClick={fetchRecipes}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors border border-white/20"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Discover New
          </button>
        </div>

        {/* Daily targets strip */}
        {targets && (
          <div className="grid grid-cols-4 gap-2 mt-1">
            {[
              { label: 'Calories', value: `${round1(targets.daily_calories)}`, unit: 'kcal', color: 'bg-white/10' },
              { label: 'Protein',  value: `${round1(targets.protein_g)}`,      unit: 'g',    color: 'bg-white/10' },
              { label: 'Carbs',    value: `${round1(targets.carbs_g)}`,        unit: 'g',    color: 'bg-white/10' },
              { label: 'Fat',      value: `${round1(targets.fat_g)}`,          unit: 'g',    color: 'bg-white/10' },
            ].map(t => (
              <div key={t.label} className={`${t.color} rounded-xl px-2 py-1.5 text-center`}>
                <p className="text-white font-extrabold text-xs leading-none">
                  {t.value}<span className="text-primary-200 text-[9px] ml-0.5">{t.unit}</span>
                </p>
                <p className="text-primary-300 text-[9px] mt-0.5">{t.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar sticky top-0 z-10 shadow-sm">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              filter === f.key
                ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            <span>{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Recipe grid ── */}
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            <p className="text-gray-400 text-sm font-medium">Finding your best matches...</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <p className="text-gray-600 font-semibold mb-1">No recipes found</p>
            <p className="text-gray-400 text-sm">Try a different filter or tap Discover New.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 font-medium mb-3">
              {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} matched
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {recipes.map((r: any) => <RecipeCard key={r.id} recipe={r} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

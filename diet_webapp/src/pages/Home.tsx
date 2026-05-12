import { useEffect, useState } from 'react'
import { getRecommendations } from '../services/api'
import { useAuth } from '../context/AuthContext'
import RecipeCard from '../components/RecipeCard'

const FILTERS = ['All', 'breakfast', 'lunch', 'dinner', 'snack']

function getCacheKeys(userId: number) {
  return {
    recipes : `cached_recommendations_${userId}`,
    targets : `cached_targets_${userId}`
  }
}

export default function Home() {
  const { user }                        = useAuth()
  const [allRecipes, setAllRecipes]     = useState<any[]>([])
  const [targets, setTargets]           = useState<any>(null)
  const [loading, setLoading]           = useState(false)
  const [filter, setFilter]             = useState('All')

  const fetchRecipes = async () => {
    if (!user?.id) return
    const { recipes: CACHE_KEY, targets: CACHE_TARGET } = getCacheKeys(user.id)
    setLoading(true)
    try {
      const res  = await getRecommendations({ top_n: 50 })
      const data = res.data.recommendations || []
      setAllRecipes(data)
      setTargets(res.data.user_targets)
      localStorage.setItem(CACHE_KEY,    JSON.stringify(data))
      localStorage.setItem(CACHE_TARGET, JSON.stringify(res.data.user_targets))
    } catch (err: any) {
      console.error(err)
    } finally { setLoading(false) }
  }

useEffect(() => {
  console.log('user?.id:', user?.id)
  console.log('cache key:', user?.id ? `cached_recommendations_${user.id}` : 'none')
  console.log('cached value:', user?.id ? localStorage.getItem(`cached_recommendations_${user.id}`) : 'none')
  if (!user?.id) return
  const { recipes: CACHE_KEY, targets: CACHE_TARGET } = getCacheKeys(user.id)
  const cached        = localStorage.getItem(CACHE_KEY)
  const cachedTargets = localStorage.getItem(CACHE_TARGET)
  if (cached) {
    setAllRecipes(JSON.parse(cached))
    setTargets(cachedTargets ? JSON.parse(cachedTargets) : null)
  } else {
    fetchRecipes()
  }
}, [user?.id])

  const recipes = filter === 'All'
    ? allRecipes
    : allRecipes.filter(r => r.meal_type?.toLowerCase() === filter.toLowerCase())

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-primary-600 px-4 pt-6 pb-5">
        <h1 className="text-white text-xl font-bold mb-1">🥗 Recommended Recipes</h1>
        {targets && (
          <p className="text-primary-100 text-xs">
            Daily target: {targets.daily_calories} kcal • P: {targets.protein_g}g • C: {targets.carbs_g}g • F: {targets.fat_g}g
          </p>
        )}
      </div>

      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex gap-2 overflow-x-auto no-scrollbar sticky top-0 z-10">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors border ${
              filter === f
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-primary-400'
            }`}
          >
            {f}
          </button>
        ))}
        <button
          onClick={fetchRecipes}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-colors ml-auto"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            <p className="text-gray-400 text-sm">Finding suitable recipes...</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-5xl mb-3">🔍</span>
            <p className="text-gray-400">No recipes found for this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {recipes.map((r: any) => <RecipeCard key={r.id} recipe={r} />)}
          </div>
        )}
      </div>
    </div>
  )
}
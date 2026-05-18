import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFavorites, unsaveRecipe } from '../services/api'
import { useAuth } from '../context/AuthContext'

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'

// Separate component so useState is called at the top level of a component, not inside .map()
function RecipeRow({ recipe, onRemove, removing }: {
  recipe: any
  onRemove: (id: number, e: React.MouseEvent) => void
  removing: boolean
}) {
  const navigate        = useNavigate()
  const [imgErr, setImgErr] = useState(false)
  const imgSrc = imgErr || !recipe.image_url ? DEFAULT_IMG : recipe.image_url

  return (
    <div
      onClick={() => navigate(`/recipe/${recipe.id}`)}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.99] overflow-hidden"
    >
      <div className="flex items-center gap-3 p-3">
        <img
          src={imgSrc}
          alt={recipe.name}
          onError={() => setImgErr(true)}
          className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider capitalize mb-0.5">
            {recipe.meal_type}
          </p>
          <p className="text-sm font-bold text-gray-800 line-clamp-2 capitalize">{recipe.name}</p>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-1.5 py-0.5 rounded-md">
              🔥 {Math.round(recipe.calories || 0)} kcal
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded-md">
              P {(recipe.protein || 0).toFixed(1)}g
            </span>
            <span className="text-[10px] bg-yellow-50 text-yellow-600 font-bold px-1.5 py-0.5 rounded-md">
              C {(recipe.carbs || 0).toFixed(1)}g
            </span>
          </div>
        </div>
        <button
          onClick={(e) => onRemove(recipe.id, e)}
          disabled={removing}
          className="flex-shrink-0 w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
        >
          {removing
            ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
            : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
          }
        </button>
      </div>
    </div>
  )
}

export default function Favorites() {
  const navigate        = useNavigate()
  const { user }        = useAuth()
  const activeProfileId = user?.active_profile_id

  const [recipes, setRecipes]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [removing, setRemoving] = useState<number | null>(null)

  const fetchFavorites = async () => {
    setLoading(true)
    try {
      const res = await getFavorites()
      setRecipes(res.data.favorites || [])
    } catch (_) {} finally { setLoading(false) }
  }

  useEffect(() => { fetchFavorites() }, [activeProfileId])

  const handleRemove = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setRemoving(id)
    try {
      await unsaveRecipe(id)
      setRecipes(prev => prev.filter(r => r.id !== id))
    } catch (_) {} finally { setRemoving(null) }
  }

  return (
    <div className="max-w-2xl mx-auto pb-8">

      {/* Header */}
      <div className="bg-primary-600 px-4 pt-6 pb-5 flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-white text-xl font-extrabold">Saved Recipes</h1>
          <p className="text-primary-200 text-xs mt-0.5">
            {loading ? '...' : `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''} saved`}
          </p>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🔖</div>
            <p className="text-gray-700 font-bold mb-1">No saved recipes yet</p>
            <p className="text-gray-400 text-sm mb-5">Tap the heart icon on any recipe to save it here.</p>
            <button onClick={() => navigate('/')}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-3 rounded-2xl transition-colors text-sm">
              Browse Recipes
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recipes.map((recipe: any) => (
              <RecipeRow
                key={recipe.id}
                recipe={recipe}
                onRemove={handleRemove}
                removing={removing === recipe.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

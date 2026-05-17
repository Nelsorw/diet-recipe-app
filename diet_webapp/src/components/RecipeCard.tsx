import { useNavigate } from 'react-router-dom'

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'

// Normalise dish_type labels that don't look good on the card
function formatDishType(raw: string): string {
  if (!raw) return ''
  const map: Record<string, string> = {
    'other'       : 'Main Dish',
    'Other'       : 'Main Dish',
  }
  return map[raw] ?? raw
}

// Normalise dietary_attributes labels
function formatDietaryAttr(raw: string): string {
  if (!raw || raw === 'No Nutritional Focus') return ''
  const map: Record<string, string> = {
    'Strict Diet' : 'Balanced',
    'strict diet' : 'Balanced',
  }
  return map[raw] ?? raw
}

// Badge colour based on match score
function scoreBadgeClass(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 65) return 'bg-primary-600'
  return 'bg-amber-500'
}

export default function RecipeCard({ recipe }: { recipe: any }) {
  const navigate    = useNavigate()
  const score       = recipe.suitability_score ? Math.round(recipe.suitability_score * 100) : null
  const imgSrc      = recipe.image_url || DEFAULT_IMG
  const dishLabel   = formatDishType(recipe.dish_type || '')
  const dietLabel   = formatDietaryAttr(recipe.dietary_attributes || '')
  const mealMinutes = recipe.minutes ? `${recipe.minutes} min` : null

  return (
    <div
      onClick={() => navigate(`/recipe/${recipe.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group"
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        <img
          src={imgSrc}
          alt={recipe.name}
          className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
          onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMG }}
        />

        {/* Match score badge — top right */}
        {score !== null && (
          <span className={`absolute top-2 right-2 ${scoreBadgeClass(score)} text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow`}>
            {score}% match
          </span>
        )}

        {/* Dish type — bottom left */}
        {dishLabel && (
          <span className="absolute bottom-2 left-2 bg-black/55 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize">
            {dishLabel}
          </span>
        )}

        {/* Cook time — bottom right */}
        {mealMinutes && (
          <span className="absolute bottom-2 right-2 bg-black/55 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            ⏱ {mealMinutes}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Recipe name */}
        <h3 className="font-bold text-gray-800 text-sm leading-snug mb-2.5 line-clamp-2 group-hover:text-primary-700 transition-colors capitalize">
          {recipe.name || 'Recipe'}
        </h3>

        {/* Nutrition row */}
        <div className="grid grid-cols-4 gap-1 mb-2.5 bg-gray-50 rounded-xl p-2">
          {[
            { label: 'Cal',  value: Math.round(recipe.calories || 0),        unit: ''  },
            { label: 'Pro',  value: Math.round(recipe.protein  || 0),        unit: 'g' },
            { label: 'Carb', value: Math.round(recipe.carbs    || 0),        unit: 'g' },
            { label: 'Fat',  value: Math.round(recipe.fat      || 0),        unit: 'g' },
          ].map(n => (
            <div key={n.label} className="text-center">
              <p className="text-primary-600 font-extrabold text-xs leading-none">
                {n.value}<span className="text-[9px] font-semibold text-primary-400">{n.unit}</span>
              </p>
              <p className="text-gray-400 text-[9px] mt-0.5">{n.label}</p>
            </div>
          ))}
        </div>

        {/* Dietary attribute tag */}
        {dietLabel && (
          <span className="inline-block bg-primary-50 text-primary-700 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-primary-100">
            {dietLabel}
          </span>
        )}
      </div>
    </div>
  )
}

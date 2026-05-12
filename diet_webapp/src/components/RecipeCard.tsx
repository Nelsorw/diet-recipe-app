import { useNavigate } from 'react-router-dom'

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'

export default function RecipeCard({ recipe }: { recipe: any }) {
  const navigate = useNavigate()
  const score    = recipe.suitability_score ? Math.round(recipe.suitability_score * 100) : null
  const imgSrc   = recipe.image_url || DEFAULT_IMG

  return (
    <div
      onClick={() => navigate(`/recipe/${recipe.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
    >
      {/* Image */}
      <div className="relative">
        <img
          src={imgSrc}
          alt={recipe.name}
          className="w-full h-36 object-cover"
          onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMG }}
        />
        {score && (
          <span className="absolute top-2 right-2 bg-primary-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {score}%
          </span>
        )}
        {recipe.meal_type && (
          <span className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize">
            {recipe.meal_type}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-bold text-gray-800 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-primary-700 transition-colors">
          {recipe.name || 'Recipe'}
        </h3>

        {/* Nutrition */}
        <div className="grid grid-cols-4 gap-1 mb-2">
          {[
            { label: 'Cal',  value: Math.round(recipe.calories || 0) },
            { label: 'Pro',  value: `${Math.round(recipe.protein || 0)}g` },
            { label: 'Carb', value: `${Math.round(recipe.carbs || 0)}g` },
            { label: 'Fat',  value: `${Math.round(recipe.fat || 0)}g` },
          ].map(n => (
            <div key={n.label} className="text-center">
              <p className="text-primary-600 font-bold text-xs">{n.value}</p>
              <p className="text-gray-400 text-[10px]">{n.label}</p>
            </div>
          ))}
        </div>

        {recipe.dietary_attributes && recipe.dietary_attributes !== 'No Nutritional Focus' && (
          <span className="inline-block bg-primary-50 text-primary-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            {recipe.dietary_attributes}
          </span>
        )}
      </div>
    </div>
  )
}
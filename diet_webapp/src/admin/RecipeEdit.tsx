import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminGetRecipe, adminUpdateRecipe } from '../services/api'

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'
const MEAL_TYPES  = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'soup', 'condiment']
const DISH_TYPES  = ['Main Dish', 'Side Dish', 'Appetizer', 'Dessert', 'Beverage', 'Salad', 'Soup', 'Snack', 'Other']
const DIET_ATTRS  = ['No Nutritional Focus', 'Low Carb', 'High Protein', 'Low Fat', 'Balanced', 'Vegan', 'Vegetarian']

export default function RecipeEdit() {
  const { id }                  = useParams()
  const navigate                = useNavigate()
  const [recipe, setRecipe]     = useState<any>(null)
  const [form, setForm]         = useState<any>({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [imgErr, setImgErr]     = useState(false)

  useEffect(() => {
    adminGetRecipe(Number(id))
      .then(res => {
        setRecipe(res.data)
        setForm({
          name              : res.data.name || '',
          minutes           : res.data.minutes || 0,
          calories          : res.data.calories || 0,
          protein           : res.data.protein || 0,
          carbs             : res.data.carbs || 0,
          fat               : res.data.fat || 0,
          sugar             : res.data.sugar || 0,
          sodium            : res.data.sodium || 0,
          saturated_fat     : res.data.saturated_fat || 0,
          meal_type         : res.data.meal_type || '',
          dish_type         : res.data.dish_type || '',
          dietary_attributes: res.data.dietary_attributes || '',
          image_url         : res.data.image_url || '',
          description       : res.data.description || '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const set = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setSaved(false)
    try {
      await adminUpdateRecipe(Number(id), form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (_) {} finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )
  if (!recipe) return <div className="p-8 text-red-500">Recipe not found.</div>

  const imgSrc = imgErr || !form.image_url ? DEFAULT_IMG : form.image_url

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-3xl">

      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/recipes')} className="text-gray-400 hover:text-gray-600 text-sm font-semibold">← Recipes</button>
        <div className="flex-1">
          <h1 className="text-base md:text-xl font-extrabold text-gray-900 line-clamp-1 capitalize">{recipe.name}</h1>
          <p className="text-gray-400 text-xs">#{recipe.id} · {recipe.stats?.times_logged} logs · {recipe.stats?.times_planned} plans · {recipe.stats?.times_saved} saves</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Image preview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-sm mb-3">Image</h2>
          <div className="flex gap-4 items-start">
            <img src={imgSrc} alt={form.name} onError={() => setImgErr(true)}
              className="w-24 h-24 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Image URL</label>
              <input value={form.image_url} onChange={e => { set('image_url', e.target.value); setImgErr(false) }}
                placeholder="https://..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-gray-800 text-sm">Basic Info</h2>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Recipe Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Meal Type</label>
              <select value={form.meal_type} onChange={e => set('meal_type', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white capitalize">
                {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Dish Type</label>
              <select value={form.dish_type} onChange={e => set('dish_type', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                {DISH_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Dietary</label>
              <select value={form.dietary_attributes} onChange={e => set('dietary_attributes', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                {DIET_ATTRS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Cook Time (minutes)</label>
            <input type="number" value={form.minutes} onChange={e => set('minutes', Number(e.target.value))}
              className="w-32 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        {/* Nutrition */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-gray-800 text-sm">Nutrition (per serving)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">            {[
              { key: 'calories',      label: 'Calories',      unit: 'kcal' },
              { key: 'protein',       label: 'Protein',       unit: 'g' },
              { key: 'carbs',         label: 'Carbs',         unit: 'g' },
              { key: 'fat',           label: 'Fat',           unit: 'g' },
              { key: 'sugar',         label: 'Sugar',         unit: 'g' },
              { key: 'sodium',        label: 'Sodium',        unit: 'mg' },
              { key: 'saturated_fat', label: 'Saturated Fat', unit: 'g' },
            ].map(n => (
              <div key={n.key}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  {n.label} <span className="text-gray-300 font-normal">({n.unit})</span>
                </label>
                <input type="number" step="0.1" value={form[n.key]} onChange={e => set(n.key, Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl transition-colors">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-green-600 text-sm font-semibold">✓ Saved successfully</span>}
        </div>
      </form>
    </div>
  )
}

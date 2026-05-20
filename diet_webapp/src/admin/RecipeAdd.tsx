import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAddRecipe } from '../services/api'

const MEAL_TYPES  = ['general', 'dinner', 'lunch', 'breakfast', 'brunch', 'snack']
const DISH_TYPES  = ['Main Dish', 'Side Dish', 'Dessert', 'Other', 'Salad', 'Beverage']
const DIET_ATTRS  = [
  'No Nutritional Focus', 'Low Carb', 'Strict Diet', 'Low Sodium',
  'Low Cholesterol', 'Low Fat', 'High Calcium', 'Low Calorie'
]

const EMPTY = {
  name: '', minutes: '', description: '', ingredients: '', steps: '',
  calories: '', protein: '', carbs: '', fat: '', sugar: '', sodium: '', saturated_fat: '',
  meal_type: 'general', dish_type: 'Main Dish', dietary_attributes: 'No Nutritional Focus',
  image_url: '',
}

export default function RecipeAdd() {
  const navigate          = useNavigate()
  const [form, setForm]   = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState<any>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Recipe name is required.'); return }
    setSaving(true); setError('')
    try {
      const res = await adminAddRecipe({
        ...form,
        minutes      : Number(form.minutes)       || 0,
        calories     : Number(form.calories)      || 0,
        protein      : Number(form.protein)       || 0,
        carbs        : Number(form.carbs)         || 0,
        fat          : Number(form.fat)           || 0,
        sugar        : Number(form.sugar)         || 0,
        sodium       : Number(form.sodium)        || 0,
        saturated_fat: Number(form.saturated_fat) || 0,
        n_ingredients: form.ingredients ? form.ingredients.split(',').length : 0,
        n_steps      : form.steps ? form.steps.split('.').filter(Boolean).length : 0,
      })
      setSuccess(res.data.recipe)
      setForm({ ...EMPTY })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add recipe.')
    } finally { setSaving(false) }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-3xl">

      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/recipes')} className="text-gray-400 hover:text-gray-600 text-sm font-semibold">← Recipes</button>
        <h1 className="text-base md:text-xl font-extrabold text-gray-900">Add New Recipe</h1>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-green-700 font-bold text-sm">✓ Recipe added — #{success.id}</p>
            <p className="text-green-600 text-xs mt-0.5 capitalize">{success.name}</p>
          </div>
          <button onClick={() => navigate(`/admin/recipes/${success.id}`)}
            className="text-xs text-green-700 border border-green-300 font-bold px-3 py-1.5 rounded-lg hover:bg-green-100">
            Edit it →
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Basic */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 space-y-4">
          <h2 className="font-bold text-gray-800 text-sm">Basic Info</h2>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Recipe Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required
              placeholder="e.g. Tomato Fried Rice with Eggs"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Meal Type *</label>
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
            <input type="number" value={form.minutes} onChange={e => set('minutes', e.target.value)}
              placeholder="30"
              className="w-32 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Image URL</label>
            <input value={form.image_url} onChange={e => set('image_url', e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        {/* Nutrition */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 space-y-3">
          <h2 className="font-bold text-gray-800 text-sm">Nutrition (per serving)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
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
                <input type="number" step="0.1" value={(form as any)[n.key]} onChange={e => set(n.key, e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Ingredients */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 space-y-3">
          <h2 className="font-bold text-gray-800 text-sm">Ingredients</h2>
          <p className="text-xs text-gray-400">Enter as a Python list: ['rice', 'eggs', 'tomatoes']</p>
          <textarea value={form.ingredients} onChange={e => set('ingredients', e.target.value)}
            rows={3} placeholder="['ingredient 1', 'ingredient 2', 'ingredient 3']"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono" />
        </div>

        {/* Steps */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 space-y-3">
          <h2 className="font-bold text-gray-800 text-sm">Preparation Steps</h2>
          <p className="text-xs text-gray-400">Enter as a Python list: ['Step 1.', 'Step 2.']</p>
          <textarea value={form.steps} onChange={e => set('steps', e.target.value)}
            rows={4} placeholder="['Heat oil in a pan.', 'Add eggs and stir.', 'Add tomatoes and rice.']"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono" />
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 space-y-3">
          <h2 className="font-bold text-gray-800 text-sm">Description (optional)</h2>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            rows={2} placeholder="A brief description of the recipe..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>

        <button type="submit" disabled={saving}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl transition-colors shadow-md">
          {saving ? 'Adding Recipe...' : '+ Add Recipe'}
        </button>
      </form>
    </div>
  )
}

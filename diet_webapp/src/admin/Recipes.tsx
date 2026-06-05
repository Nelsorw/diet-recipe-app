import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminListRecipes, adminDeleteRecipe } from '../services/api'

const MEAL_TYPES = ['', 'general', 'dinner', 'lunch', 'breakfast', 'brunch', 'snack']

export default function Recipes() {
  const navigate                  = useNavigate()
  const [recipes, setRecipes]     = useState<any[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [pages, setPages]         = useState(1)
  const [search, setSearch]       = useState('')
  const [mealType, setMealType]   = useState('')
  const [hasImage, setHasImage]   = useState('')
  const [loading, setLoading]     = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const [deleting, setDeleting]   = useState(false)

  const fetchRecipes = async (p = 1, q = search, mt = mealType, img = hasImage) => {
    setLoading(true)
    try {
      const res = await adminListRecipes({ page: p, per_page: 20, q, meal_type: mt, has_image: img })
      setRecipes(res.data.recipes || [])
      setTotal(res.data.total || 0)
      setPages(res.data.pages || 1)
      setPage(p)
    } catch (_) {} finally { setLoading(false) }
  }

  useEffect(() => { fetchRecipes() }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchRecipes(1, search, mealType, hasImage)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await adminDeleteRecipe(confirmDelete.id)
      setConfirmDelete(null)
      fetchRecipes(page, search, mealType, hasImage)
    } catch (_) {} finally { setDeleting(false) }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-800 mb-1">Delete Recipe</h3>
            <p className="text-sm text-gray-500 mb-5">Delete <strong className="line-clamp-1">{confirmDelete.name}</strong>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border border-gray-200 text-gray-500 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Recipes</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total.toLocaleString()} recipes</p>
        </div>
        <button onClick={() => navigate('/admin/recipes/add')}
          className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add Recipe
        </button>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex gap-3 flex-wrap">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <select value={mealType} onChange={e => setMealType(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
          {MEAL_TYPES.map(m => <option key={m} value={m}>{m || 'All meal types'}</option>)}
        </select>
        <select value={hasImage} onChange={e => setHasImage(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
          <option value="">All images</option>
          <option value="yes">Has image</option>
          <option value="no">No image</option>
        </select>
        <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          Search
        </button>
      </form>

      {/* Table — desktop */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hidden md:block">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Recipe</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Cal</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Protein</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Image</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recipes.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800 line-clamp-1 max-w-[280px] capitalize">{r.name}</p>
                    <p className="text-xs text-gray-400">#{r.id} · {r.n_ingredients} ingredients</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full capitalize">
                      {r.meal_type || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{Math.round(r.calories || 0)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{(r.protein || 0).toFixed(1)}g</td>
                  <td className="px-4 py-3 text-center">
                    {r.image_url
                      ? <svg className="w-4 h-4 text-green-500 mx-auto" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      : <span className="text-gray-300 text-xs">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => navigate(`/admin/recipes/${r.id}`)} className="text-xs text-primary-600 hover:text-primary-800 font-semibold">Edit</button>
                      <button onClick={() => setConfirmDelete(r)} className="text-xs text-red-400 hover:text-red-600 font-semibold">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cards — mobile */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : recipes.map(r => (
          <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-1">
              <p className="font-bold text-gray-800 text-sm line-clamp-2 capitalize flex-1 mr-2">{r.name}</p>
              {r.image_url ? <span className="text-green-500 text-xs font-bold flex-shrink-0">📷</span> : <span className="text-gray-300 text-xs flex-shrink-0">No img</span>}
            </div>
            <div className="flex gap-3 text-xs text-gray-500 mb-3">
              <span className="capitalize">{r.meal_type || '—'}</span>
              <span>🔥 {Math.round(r.calories || 0)} kcal</span>
              <span>P {(r.protein || 0).toFixed(1)}g</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate(`/admin/recipes/${r.id}`)}
                className="flex-1 text-xs text-primary-600 border border-primary-200 font-semibold py-1.5 rounded-lg hover:bg-primary-50">Edit</button>
              <button onClick={() => setConfirmDelete(r)}
                className="flex-1 text-xs text-red-400 border border-red-200 font-semibold py-1.5 rounded-lg hover:bg-red-50">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Page {page} of {pages} · {total.toLocaleString()} recipes</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => fetchRecipes(page - 1, search, mealType, hasImage)}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
            <button disabled={page >= pages} onClick={() => fetchRecipes(page + 1, search, mealType, hasImage)}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}

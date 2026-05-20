import { useEffect, useState } from 'react'
import { adminRecipeStats } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

export default function RecipeStats() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminRecipeStats()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )
  if (!data) return <div className="p-8 text-red-500">Failed to load stats.</div>

  const imagePct = data.total ? Math.round((data.with_image / data.total) * 100) : 0

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Recipe Stats</h1>
        <p className="text-gray-400 text-sm mt-0.5">Analytics across {data.total?.toLocaleString()} recipes</p>
      </div>

      {/* Image coverage */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-2xl md:text-3xl font-extrabold text-gray-900">{data.total?.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Total Recipes</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-2xl md:text-3xl font-extrabold text-green-600">{data.with_image?.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">With Image ({imagePct}%)</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-2xl md:text-3xl font-extrabold text-red-500">{data.without_image?.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Without Image ({100 - imagePct}%)</p>
        </div>
      </div>

      {/* Image coverage bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-800 text-sm mb-3">Image Coverage</h2>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${imagePct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1.5">
          <span>{data.with_image?.toLocaleString()} with image</span>
          <span>{imagePct}% coverage</span>
          <span>{data.without_image?.toLocaleString()} missing</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Most logged */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-sm mb-4">Most Logged Recipes</h2>
          {data.top_logged?.length === 0 ? (
            <p className="text-gray-400 text-sm">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.top_logged} layout="vertical" barSize={14}>
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={150} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.top_logged.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Most planned */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-sm mb-4">Most Planned Recipes</h2>
          {data.top_planned?.length === 0 ? (
            <p className="text-gray-400 text-sm">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.top_planned} layout="vertical" barSize={14}>
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={150} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.top_planned.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Most saved */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-sm mb-4">Most Saved Recipes</h2>
          {data.top_saved?.length === 0 ? (
            <p className="text-gray-400 text-sm">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {data.top_saved.map((r: any, i: number) => (
                <div key={r.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate capitalize">{r.name}</p>
                  </div>
                  <span className="text-xs font-bold text-gray-600 flex-shrink-0">{r.count} saves</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By meal type */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-sm mb-4">Recipes by Meal Type</h2>
          <div className="flex items-center gap-4">
            <PieChart width={150} height={150}>
              <Pie data={data.by_meal_type} cx={70} cy={70} innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="count">
                {data.by_meal_type?.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
            </PieChart>
            <div className="space-y-2 flex-1">
              {data.by_meal_type?.map((m: any, i: number) => (
                <div key={m.meal_type} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-gray-600 capitalize flex-1">{m.meal_type}</span>
                  <span className="text-xs font-bold text-gray-800">{m.count?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

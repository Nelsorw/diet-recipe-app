import { useEffect, useState } from 'react'
import { adminPredictionStats, adminListPredictions } from '../services/api'
import { PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function Predictions() {
  const [stats, setStats]         = useState<any>(null)
  const [preds, setPreds]         = useState<any[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [pages, setPages]         = useState(1)
  const [source, setSource]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [tableLoading, setTableLoading] = useState(false)

  useEffect(() => {
    adminPredictionStats()
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fetchPreds = async (p = 1, src = source) => {
    setTableLoading(true)
    try {
      const res = await adminListPredictions({ page: p, per_page: 30, source: src })
      setPreds(res.data.predictions || [])
      setTotal(res.data.total || 0)
      setPages(res.data.pages || 1)
      setPage(p)
    } catch (_) {} finally { setTableLoading(false) }
  }

  useEffect(() => { fetchPreds(1, source) }, [])

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )

  const pieData = stats ? [
    { name: 'Suitable',   value: stats.suitable },
    { name: 'Unsuitable', value: stats.unsuitable },
  ] : []

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Model Predictions</h1>
        <p className="text-gray-400 text-sm mt-0.5">{stats?.total?.toLocaleString()} total predictions logged</p>
      </div>

      {stats && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total',      value: stats.total,        color: 'text-gray-900' },
              { label: 'Suitable',   value: stats.suitable,     color: 'text-green-600' },
              { label: 'Unsuitable', value: stats.unsuitable,   color: 'text-red-500' },
              { label: 'Suitable %', value: `${stats.suitable_pct}%`, color: 'text-primary-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className={`text-xl md:text-2xl font-extrabold ${s.color}`}>{s.value?.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Suitable vs unsuitable donut */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 text-sm mb-4">Suitable vs Unsuitable</h2>
              <div className="flex items-center gap-4">
                <PieChart width={140} height={140}>
                  <Pie data={pieData} cx={65} cy={65} innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    <Cell fill="#16a34a" />
                    <Cell fill="#ef4444" />
                  </Pie>
                </PieChart>
                <div className="space-y-3">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i === 0 ? '#16a34a' : '#ef4444' }} />
                      <span className="text-xs text-gray-600">{d.name}</span>
                      <span className="text-xs font-bold text-gray-800 ml-auto">{d.value?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* By source */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 text-sm mb-4">By Source</h2>
              <div className="space-y-3">
                {stats.by_source?.map((s: any, i: number) => (
                  <div key={s.source} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm font-semibold text-gray-700 capitalize flex-1">{s.source}</span>
                    <span className="text-sm font-bold text-gray-800">{s.count?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Predictions by dietary restriction */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 text-sm mb-1">Predictions by Dietary Restriction</h2>
              <p className="text-xs text-gray-400 mb-4">How many recipe evaluations were made for each dietary group.</p>
              <div className="space-y-3">
                {stats.by_diet?.map((d: any, i: number) => {
                  const maxCount = Math.max(...(stats.by_diet?.map((x: any) => x.count) || [1]))
                  const pct = Math.round((d.count / maxCount) * 100)
                  return (
                    <div key={d.diet}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-gray-600">{d.diet}</span>
                        <span className="text-gray-400">{d.count?.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Predictions by health condition */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 text-sm mb-1">Predictions by Health Condition</h2>
              <p className="text-xs text-gray-400 mb-4">How many recipe evaluations were made for each health condition.</p>
              <div className="space-y-3">
                {stats.by_condition?.map((c: any, i: number) => {
                  const maxCount = Math.max(...(stats.by_condition?.map((x: any) => x.count) || [1]))
                  const pct = Math.round((c.count / maxCount) * 100)
                  return (
                    <div key={c.condition}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-gray-600">{c.condition}</span>
                        <span className="text-gray-400">{c.count?.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Model activity summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
              <h2 className="font-bold text-gray-800 text-sm mb-4">Model Activity Summary</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {stats.by_source?.map((s: any) => (
                  <div key={s.source} className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-extrabold text-gray-900">{s.count?.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1 capitalize">{s.source === 'recommendation' ? 'From Recommendations' : 'From Meal Plans'}</p>
                  </div>
                ))}
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-green-600">{stats.suitable_pct}%</p>
                  <p className="text-xs text-gray-400 mt-1">Overall Suitable Rate</p>
                </div>
                <div className="bg-primary-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-primary-600">{stats.total?.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">Total Evaluations</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Recent predictions table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold text-gray-800 text-sm">Recent Predictions ({total.toLocaleString()})</h2>
          <select value={source} onChange={e => { setSource(e.target.value); fetchPreds(1, e.target.value) }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none bg-white">
            <option value="">All sources</option>
            <option value="recommendation">Recommendations</option>
            <option value="mealplan">Meal Plan</option>
          </select>
        </div>

        {tableLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold text-gray-500 uppercase tracking-wider">Recipe</th>
                  <th className="text-left px-4 py-2.5 font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Diet</th>
                  <th className="text-left px-4 py-2.5 font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Condition</th>
                  <th className="text-center px-4 py-2.5 font-bold text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="text-center px-4 py-2.5 font-bold text-gray-500 uppercase tracking-wider">Suitable</th>
                  <th className="text-left px-4 py-2.5 font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preds.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[180px] truncate capitalize">{p.recipe_name}</td>
                    <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{p.dietary_restrictions}</td>
                    <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{p.health_condition}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-primary-600">{(p.suitability_score * 100).toFixed(0)}%</td>
                    <td className="px-4 py-2.5 text-center">
                      {p.suitable
                        ? <svg className="w-4 h-4 text-green-500 mx-auto" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        : <svg className="w-4 h-4 text-red-400 mx-auto" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      }
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.source === 'recommendation' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>{p.source}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-400">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => fetchPreds(page - 1, source)}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <button disabled={page >= pages} onClick={() => fetchPreds(page + 1, source)}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

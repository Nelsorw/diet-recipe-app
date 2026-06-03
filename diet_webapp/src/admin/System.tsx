import { useEffect, useState } from 'react'
import { adminSystem } from '../services/api'

function timeAgo(iso: string) {
  // Strip Z to treat as local time (backend stores local server time without tz info)
  const clean = iso.replace('Z', '')
  const diff  = Date.now() - new Date(clean).getTime()
  const mins  = Math.floor(Math.abs(diff) / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days  > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins  > 0) return `${mins}m ago`
  return 'Just now'
}

const TYPE_COLORS: Record<string, string> = {
  meal_reminder: 'bg-emerald-100 text-emerald-700',
  streak       : 'bg-orange-100 text-orange-700',
  perfect_day  : 'bg-yellow-100 text-yellow-700',
  meal_plan    : 'bg-blue-100 text-blue-700',
  log_reminder : 'bg-violet-100 text-violet-700',
  general      : 'bg-gray-100 text-gray-600',
}

export default function System() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminSystem()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )
  if (!data) return <div className="p-8 text-red-500">Failed to load system stats.</div>

  const { database, images, recent_notifications } = data

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">System</h1>
        <p className="text-gray-400 text-sm mt-0.5">Database, images, and recent activity</p>
      </div>

      {/* DB stats */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-800 text-sm mb-4">Database</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xl md:text-2xl font-extrabold text-gray-900">{database.size_mb} MB</p>
            <p className="text-xs text-gray-400 mt-0.5">Database size</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xl md:text-2xl font-extrabold text-gray-900">{(database.size_bytes / 1024).toFixed(0)} KB</p>
            <p className="text-xs text-gray-400 mt-0.5">Exact size</p>
          </div>
        </div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Table Row Counts</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">          {Object.entries(database.tables || {}).map(([table, count]: any) => (
            <div key={table} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-extrabold text-gray-800">{count?.toLocaleString()}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{table.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Image cache */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-800 text-sm mb-4">Cached Images</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-xl md:text-2xl font-extrabold text-green-600">{images.cached_count?.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">Cached</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-2xl font-extrabold text-gray-900">{images.total_recipes?.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total recipes</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-2xl font-extrabold text-primary-600">{images.coverage_pct}%</p>
            <p className="text-xs text-gray-400 mt-0.5">Coverage</p>
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full" style={{ width: `${images.coverage_pct}%` }} />
        </div>
      </div>

      {/* Recent notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-800 text-sm mb-4">Recent Notifications Sent</h2>
        {recent_notifications?.length === 0 ? (
          <p className="text-gray-400 text-sm">No notifications yet.</p>
        ) : (
          <div className="space-y-2">
            {recent_notifications?.map((n: any) => (
              <div key={n.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${TYPE_COLORS[n.type] || TYPE_COLORS.general}`}>
                  {n.type?.replace('_', ' ')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{n.title}</p>
                  <p className="text-xs text-gray-400 truncate">{n.body?.split('\n')[0]}</p>
                </div>
                <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">{timeAgo(n.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

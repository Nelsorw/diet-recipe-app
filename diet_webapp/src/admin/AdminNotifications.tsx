import { useEffect, useState } from 'react'
import { adminGetNotifications, adminMarkNotifRead, adminMarkAllNotifsRead } from '../services/api'

const TYPE_COLORS: Record<string, string> = {
  new_user   : 'bg-blue-50 text-blue-700 border-blue-100',
  new_profile: 'bg-green-50 text-green-700 border-green-100',
  system     : 'bg-gray-50 text-gray-700 border-gray-100',
}

function timeAgo(iso: string): string {
  // The backend stores naive datetime (local server time) but labels it Z.
  // Strip Z and treat as local time by not adding any suffix.
  const clean = iso.replace('Z', '')
  const stored = new Date(clean)
  // stored is parsed as local time — compare with local now
  const diff = Date.now() - stored.getTime()
  const absDiff = Math.abs(diff)
  const mins  = Math.floor(absDiff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function AdminNotifications() {
  const [items, setItems]     = useState<any[]>([])
  const [total, setTotal]     = useState(0)
  const [unread, setUnread]   = useState(0)
  const [page, setPage]       = useState(1)
  const [pages, setPages]     = useState(1)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all' | 'unread'>('all')

  const fetch = async (p = 1, f = filter) => {
    setLoading(true)
    try {
      const res = await adminGetNotifications({
        page    : p,
        per_page: 30,
        unread  : f === 'unread' ? 'true' : 'false',
      })
      setItems(res.data.notifications || [])
      setTotal(res.data.total || 0)
      setUnread(res.data.unread || 0)
      setPage(p)
      setPages(res.data.pages || 1)
    } catch (_) {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetch(1, filter) }, [filter])

  const markRead = async (id: number) => {
    await adminMarkNotifRead(id)
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(u => Math.max(0, u - 1))
  }

  const markAll = async () => {
    await adminMarkAllNotifsRead()
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Notifications</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {total.toLocaleString()} total · {unread} unread
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(['all', 'unread'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                  filter === f ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}>
                {f === 'unread' ? `Unread (${unread})` : 'All'}
              </button>
            ))}
          </div>
          {unread > 0 && (
            <button onClick={markAll}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 border border-primary-200 px-3 py-1.5 rounded-xl hover:bg-primary-50 transition-colors">
              Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-gray-500 font-semibold">No notifications</p>
          <p className="text-gray-400 text-sm mt-1">New user registrations and profile creations will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(n => (
            <div key={n.id}
              className={`bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-3 transition-all ${
                n.is_read ? 'opacity-70' : 'border-primary-100'
              }`}
            >
              {/* content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-bold ${n.is_read ? 'text-gray-500' : 'text-gray-800'}`}>
                    {n.title}
                  </p>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(n.created_at)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
              </div>

              {/* unread dot + mark read */}
              {!n.is_read && (
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary-500" />
                  <button onClick={() => markRead(n.id)}
                    className="text-[10px] text-gray-400 hover:text-primary-600 font-semibold">
                    ✓
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => fetch(page - 1)}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
            <button disabled={page >= pages} onClick={() => fetch(page + 1)}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}

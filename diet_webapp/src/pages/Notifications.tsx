import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNotifications, markNotifRead, markAllNotifsRead } from '../services/api'
import { useAuth } from '../context/AuthContext'

const TYPE_CONFIG: Record<string, { icon: string; bg: string; text: string; border: string; bar: string }> = {
  meal_reminder: { icon: '🍽', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', bar: 'bg-emerald-500' },
  streak       : { icon: '🔥', bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-100',  bar: 'bg-orange-500'  },
  perfect_day  : { icon: '🏆', bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-100',  bar: 'bg-yellow-500'  },
  meal_plan    : { icon: '📅', bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100',    bar: 'bg-blue-500'    },
  log_reminder : { icon: '✏️', bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-100',  bar: 'bg-violet-500'  },
  general      : { icon: '💬', bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-100',    bar: 'bg-gray-400'    },
}

const TYPE_LABELS: Record<string, string> = {
  meal_reminder: 'Meal Reminder',
  streak       : 'Streak',
  perfect_day  : 'Achievement',
  meal_plan    : 'Meal Plan',
  log_reminder : 'Reminder',
  general      : 'General',
}

function timeAgo(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime()
  const secs  = Math.floor(diff / 1000)
  const mins  = Math.floor(secs  / 60)
  const hours = Math.floor(mins  / 60)
  const days  = Math.floor(hours / 24)
  if (days  > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins  > 0) return `${mins}m ago`
  return 'Just now'
}

function NotifCard({ notif, onRead }: { notif: any; onRead: (id: number) => void }) {
  const cfg   = TYPE_CONFIG[notif.type] || TYPE_CONFIG.general
  const label = TYPE_LABELS[notif.type] || 'General'

  return (
    <div
      onClick={() => { if (!notif.is_read) onRead(notif.id) }}
      className={`relative rounded-2xl border p-4 transition-all cursor-pointer overflow-hidden ${
        notif.is_read
          ? 'bg-white border-gray-100 opacity-55'
          : `bg-white border-gray-200 shadow-sm hover:shadow-md ${cfg.border}`
      }`}
    >
      {/* left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${notif.is_read ? 'bg-gray-100' : cfg.bar}`} />

      <div className="flex gap-3 pl-2">
        {/* icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${cfg.bg}`}>
          {cfg.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-sm font-bold leading-snug ${notif.is_read ? 'text-gray-400' : 'text-gray-800'}`}>
                {notif.title}
              </p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                {label}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap mt-0.5">
              {timeAgo(notif.created_at)}
            </span>
          </div>
          <p className={`text-xs leading-relaxed whitespace-pre-line ${notif.is_read ? 'text-gray-400' : 'text-gray-500'}`}>
            {notif.body}
          </p>
        </div>

        {!notif.is_read && (
          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${cfg.bar}`} />
        )}
      </div>
    </div>
  )
}

export default function Notifications() {
  const navigate        = useNavigate()
  const { user }        = useAuth()
  const activeProfileId = user?.active_profile_id

  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [markingAll, setMarkingAll]       = useState(false)

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await getNotifications()
      setNotifications(res.data.notifications || [])
    } catch (_) {} finally { setLoading(false) }
  }

  useEffect(() => { fetchNotifications() }, [activeProfileId])

  const handleRead = async (id: number) => {
    try {
      await markNotifRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (_) {}
  }

  const handleMarkAll = async () => {
    setMarkingAll(true)
    try {
      await markAllNotifsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (_) {} finally { setMarkingAll(false) }
  }

  const unread = notifications.filter(n => !n.is_read).length
  const read   = notifications.filter(n =>  n.is_read)
  const fresh  = notifications.filter(n => !n.is_read)

  return (
    <div className="max-w-2xl mx-auto pb-8">

      {/* Header */}
      <div className="bg-primary-600 px-4 pt-6 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-white text-xl font-extrabold">Notifications</h1>
              <p className="text-primary-200 text-xs mt-0.5">
                {unread > 0 ? `${unread} unread` : 'All caught up ✓'}
              </p>
            </div>
          </div>
          {unread > 0 && (
            <button onClick={handleMarkAll} disabled={markingAll}
              className="text-xs bg-white/20 hover:bg-white/30 text-white font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50">
              {markingAll ? 'Marking...' : 'Mark all read'}
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🔔</div>
            <p className="text-gray-700 font-bold mb-1">No notifications yet</p>
            <p className="text-gray-400 text-sm">You'll be notified about meals, streaks and achievements.</p>
          </div>
        ) : (
          <>
            {fresh.length > 0 && (
              <>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">New</p>
                {fresh.map(n => <NotifCard key={n.id} notif={n} onRead={handleRead} />)}
              </>
            )}
            {read.length > 0 && (
              <>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 pt-2">Earlier</p>
                {read.map(n => <NotifCard key={n.id} notif={n} onRead={handleRead} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

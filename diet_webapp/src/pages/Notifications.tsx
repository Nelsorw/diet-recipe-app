import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNotifications, markNotifRead, markAllNotifsRead, deleteNotification } from '../services/api'
import { useAuth } from '../context/AuthContext'

const TYPE_COLORS: Record<string, { bar: string; bg: string; text: string }> = {
  meal_reminder : { bar: 'bg-emerald-500', bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  streak        : { bar: 'bg-orange-500',  bg: 'bg-orange-50',   text: 'text-orange-700'  },
  perfect_day   : { bar: 'bg-yellow-500',  bg: 'bg-yellow-50',   text: 'text-yellow-700'  },
  meal_plan     : { bar: 'bg-blue-500',    bg: 'bg-blue-50',     text: 'text-blue-700'    },
  log_reminder  : { bar: 'bg-violet-500',  bg: 'bg-violet-50',   text: 'text-violet-700'  },
  general       : { bar: 'bg-gray-400',    bg: 'bg-gray-50',     text: 'text-gray-700'    },
}

const TYPE_LABELS: Record<string, string> = {
  meal_reminder : 'Meal Reminder',
  streak        : 'Streak',
  perfect_day   : 'Achievement',
  meal_plan     : 'Meal Plan',
  log_reminder  : 'Reminder',
  general       : 'General',
}

function timeAgo(iso: string) {
  const clean = iso.replace('Z', '')
  const diff  = Date.now() - new Date(clean).getTime()
  const secs  = Math.floor(Math.abs(diff) / 1000)
  const mins  = Math.floor(secs  / 60)
  const hours = Math.floor(mins  / 60)
  const days  = Math.floor(hours / 24)
  if (days  > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins  > 0) return `${mins}m ago`
  if (secs  > 0) return `${secs}s ago`
  return 'Just now'
}

function NotifCard({ notif, onRead, onDelete }: { notif: any; onRead: (id: number) => void; onDelete: (id: number) => void }) {
  const colors = TYPE_COLORS[notif.type] || TYPE_COLORS.general
  const label  = TYPE_LABELS[notif.type] || 'General'

  return (
    <div
      className={`relative flex gap-4 p-4 rounded-2xl border transition-all overflow-hidden ${
        notif.is_read
          ? 'bg-white border-gray-100 opacity-60'
          : 'bg-white border-gray-200 shadow-sm hover:shadow-md'
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${notif.is_read ? 'bg-gray-200' : colors.bar}`} />
      <div className="flex-shrink-0 pt-0.5 cursor-pointer" onClick={() => { if (!notif.is_read) onRead(notif.id) }}>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${colors.bg} ${colors.text}`}>
          {label}
        </span>
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { if (!notif.is_read) onRead(notif.id) }}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className={`text-sm font-bold leading-snug ${notif.is_read ? 'text-gray-400' : 'text-gray-800'}`}>
            {notif.title}
          </p>
          <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5 whitespace-nowrap">
            {timeAgo(notif.created_at)}
          </span>
        </div>
        <p className={`text-xs leading-relaxed whitespace-pre-line ${notif.is_read ? 'text-gray-400' : 'text-gray-500'}`}>
          {notif.body}
        </p>
      </div>
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
        {!notif.is_read && <div className={`w-2 h-2 rounded-full ${colors.bar}`} />}
        <button
          onClick={() => onDelete(notif.id)}
          className="w-6 h-6 rounded-full hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function Notifications() {
  const navigate                          = useNavigate()
  const { user }                          = useAuth()
  const activeProfileId                   = user?.active_profile_id
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

  const handleDelete = async (id: number) => {
    try {
      await deleteNotification(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
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

  // safe back — go to /more if no history
  const handleBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/more')
  }

  return (
    <div className="max-w-2xl mx-auto pb-8">

      {/* Header */}
      <div className="bg-primary-600 px-4 pt-6 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors text-sm font-bold"
            >
              ←
            </button>
            <div>
              <h1 className="text-white text-xl font-bold">Notifications</h1>
              <p className="text-primary-200 text-xs mt-0.5">
                {unread > 0 ? `${unread} unread` : 'All caught up'}
              </p>
            </div>
          </div>
          {unread > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={markingAll}
              className="text-xs bg-white/20 hover:bg-white/30 text-white font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
            >
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
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-gray-700 font-semibold mb-1">No notifications yet</p>
            <p className="text-gray-400 text-sm">You'll be notified about meals, streaks and goals.</p>
          </div>
        ) : (
          <>
            {notifications.filter(n => !n.is_read).length > 0 && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1 pt-1">New</p>
            )}
            {notifications.filter(n => !n.is_read).map(n => (
              <NotifCard key={n.id} notif={n} onRead={handleRead} onDelete={handleDelete} />
            ))}
            {notifications.filter(n => n.is_read).length > 0 && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1 pt-3">Earlier</p>
            )}
            {notifications.filter(n => n.is_read).map(n => (
              <NotifCard key={n.id} notif={n} onRead={handleRead} onDelete={handleDelete} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

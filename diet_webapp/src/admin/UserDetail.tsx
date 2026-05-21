import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminGetUser, adminDeleteUser, adminToggleAdmin, fixImageUrl } from '../services/api'

export default function UserDetail() {
  const { id }                    = useParams()
  const navigate                  = useNavigate()
  const [data, setData]           = useState<any>(null)
  const [loading, setLoading]     = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]   = useState(false)

  useEffect(() => {
    adminGetUser(Number(id))
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await adminDeleteUser(Number(id))
      navigate('/admin/users')
    } catch (_) {} finally { setDeleting(false) }
  }

  const handleToggleAdmin = async () => {
    try {
      const res = await adminToggleAdmin(Number(id))
      setData((prev: any) => ({ ...prev, user: { ...prev.user, is_admin: res.data.is_admin } }))
    } catch (_) {}
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )
  if (!data) return <div className="p-8 text-red-500">User not found.</div>

  const { user, profiles, stats, recent_logs } = data

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-800 mb-1">Delete User</h3>
            <p className="text-sm text-gray-500 mb-1">Delete <strong>{user.username}</strong>?</p>
            <p className="text-xs text-red-500 mb-5">All their data will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 border border-gray-200 text-gray-500 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/users')} className="text-gray-400 hover:text-gray-600 text-sm font-semibold">← Users</button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">{user.username}</h1>
          <p className="text-gray-400 text-sm">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleToggleAdmin}
            className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${
              user.is_admin ? 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}>
            {user.is_admin ? '✓ Admin' : 'Make Admin'}
          </button>
          <button onClick={() => setConfirmDelete(true)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
            Delete User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Meal Logs',     value: stats.total_logs  },
          { label: 'Meal Plans',    value: stats.total_plans },
          { label: 'Saved Recipes', value: stats.total_saved },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xl md:text-2xl font-extrabold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">        {/* Profiles */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-sm mb-3">Profiles ({profiles.length})</h2>
          {profiles.length === 0 ? (
            <p className="text-gray-400 text-sm">No profiles yet.</p>
          ) : (
            <div className="space-y-3">
              {profiles.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  {p.profile_image_url ? (
                    <img src={fixImageUrl(p.profile_image_url)!} alt={p.profile_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold flex-shrink-0">
                      {p.profile_name?.[0] || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{p.profile_name}</p>
                    <p className="text-xs text-gray-400">
                      {p.age ? `${p.age}y` : ''} {p.gender} · {p.health_goal?.replace('_', ' ')} · {p.dietary_restrictions}
                    </p>
                  </div>
                  {user.active_profile_id === p.id && (
                    <span className="text-[10px] bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">Active</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent logs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-sm mb-3">Recent Meal Logs</h2>
          {recent_logs.length === 0 ? (
            <p className="text-gray-400 text-sm">No logs yet.</p>
          ) : (
            <div className="space-y-2">
              {recent_logs.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{l.recipe_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{l.meal_type} · {l.log_date}</p>
                  </div>
                  <span className="text-xs font-bold text-orange-600">{Math.round(l.calories)} kcal</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Account info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-800 text-sm mb-3">Account Info</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-400">User ID:</span> <span className="font-semibold text-gray-700">#{user.id}</span></div>
          <div><span className="text-gray-400">Joined:</span> <span className="font-semibold text-gray-700">{new Date(user.created_at).toLocaleDateString()}</span></div>
          <div><span className="text-gray-400">Admin:</span> <span className={`font-semibold ${user.is_admin ? 'text-primary-600' : 'text-gray-500'}`}>{user.is_admin ? 'Yes' : 'No'}</span></div>
          <div><span className="text-gray-400">Active Profile:</span> <span className="font-semibold text-gray-700">#{user.active_profile_id || 'None'}</span></div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminListUsers, adminDeleteUser, adminToggleAdmin } from '../services/api'

export default function Users() {
  const navigate                  = useNavigate()
  const [users, setUsers]         = useState<any[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [pages, setPages]         = useState(1)
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const [deleting, setDeleting]   = useState(false)

  const fetchUsers = async (p = page, q = search) => {
    setLoading(true)
    try {
      const res = await adminListUsers({ page: p, per_page: 20, q })
      setUsers(res.data.users || [])
      setTotal(res.data.total || 0)
      setPages(res.data.pages || 1)
    } catch (_) {} finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers(1, search) }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers(1, search)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await adminDeleteUser(confirmDelete.id)
      setConfirmDelete(null)
      fetchUsers(page, search)
    } catch (_) {} finally { setDeleting(false) }
  }

  const handleToggleAdmin = async (id: number) => {
    try {
      await adminToggleAdmin(id)
      fetchUsers(page, search)
    } catch (_) {}
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-800 mb-1">Delete User</h3>
            <p className="text-sm text-gray-500 mb-1">Delete <strong>{confirmDelete.username}</strong>?</p>
            <p className="text-xs text-red-500 mb-5">This will permanently delete all their profiles, logs, meal plans, and data.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border border-gray-200 text-gray-500 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Users</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total.toLocaleString()} total users</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by username or email..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
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
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Profiles</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Logs</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Admin</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/admin/users/${u.id}`)} className="font-semibold text-gray-800 hover:text-primary-600 transition-colors">
                      {u.username}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{u.profile_count}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{u.log_count}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggleAdmin(u.id)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-full transition-colors ${
                        u.is_admin ? 'bg-primary-100 text-primary-700 hover:bg-primary-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>
                      {u.is_admin ? 'Admin' : 'User'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => navigate(`/admin/users/${u.id}`)} className="text-xs text-primary-600 hover:text-primary-800 font-semibold">View</button>
                      <button onClick={() => setConfirmDelete(u)} className="text-xs text-red-400 hover:text-red-600 font-semibold">Delete</button>
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
        ) : users.map(u => (
          <div key={u.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <button onClick={() => navigate(`/admin/users/${u.id}`)} className="font-bold text-gray-800 hover:text-primary-600">
                  {u.username}
                </button>
                <p className="text-xs text-gray-400">{u.email}</p>
              </div>
              <button onClick={() => handleToggleAdmin(u.id)}
                className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  u.is_admin ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
                }`}>
                {u.is_admin ? 'Admin' : 'User'}
              </button>
            </div>
            <div className="flex gap-4 text-xs text-gray-500 mb-3">
              <span>{u.profile_count} profiles</span>
              <span>{u.log_count} logs</span>
              <span>{new Date(u.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate(`/admin/users/${u.id}`)}
                className="flex-1 text-xs text-primary-600 border border-primary-200 font-semibold py-1.5 rounded-lg hover:bg-primary-50">View</button>
              <button onClick={() => setConfirmDelete(u)}
                className="flex-1 text-xs text-red-400 border border-red-200 font-semibold py-1.5 rounded-lg hover:bg-red-50">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); fetchUsers(page - 1, search) }}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
            <button disabled={page >= pages} onClick={() => { setPage(p => p + 1); fetchUsers(page + 1, search) }}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}

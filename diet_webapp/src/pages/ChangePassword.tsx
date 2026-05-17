import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { changePassword } from '../services/api'

export default function ChangePassword() {
  const navigate  = useNavigate()
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.current || !form.newPass || !form.confirm) { setMsg({ error: true, text: 'All fields are required.' }); return }
    if (form.newPass !== form.confirm) { setMsg({ error: true, text: 'Passwords do not match.' }); return }
    if (form.newPass.length < 6) { setMsg({ error: true, text: 'Password must be at least 6 characters.' }); return }
    setLoading(true); setMsg(null)
    try {
      await changePassword(form.current, form.newPass)
      setMsg({ error: false, text: 'Password changed successfully.' })
      setForm({ current: '', newPass: '', confirm: '' })
    } catch (err: any) {
      setMsg({ error: true, text: err.response?.data?.error || 'Failed to change password.' })
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-2xl mx-auto pb-8">

      <div className="bg-primary-600 px-4 pt-6 pb-5 flex items-center gap-3">
        <button onClick={() => navigate('/more')} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">←</button>
        <div>
          <h1 className="text-white text-xl font-bold">Change Password</h1>
          <p className="text-primary-200 text-xs">Update your account security</p>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          {msg && (
            <div className={`mb-4 text-sm px-4 py-3 rounded-xl border ${msg.error ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'current', label: 'Current Password',  placeholder: 'Enter your current password' },
              { key: 'newPass', label: 'New Password',       placeholder: 'Enter new password (min 6 chars)' },
              { key: 'confirm', label: 'Confirm Password',   placeholder: 'Confirm your new password' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                <input
                  type="password"
                  value={(form as any)[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                />
              </div>
            ))}
            <button type="submit" disabled={loading}
              className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors mt-2">
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
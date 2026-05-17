import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile, updateProfile, uploadProfileImage, updateProfileImage, getAllProfiles } from '../services/api'
import { useAuth } from '../context/AuthContext'

const HEALTH_CONDITIONS = [
  'No Specific Condition', 'High Blood Pressure',
  'Type 2 Diabetes', 'Heart Disease'
]
const DIET_RESTRICTIONS = [
  'Unrestricted', 'Gluten-Free', 'Dairy & Egg Free',
  'Egg-Free', 'Dairy-Free'
]
const ACTIVITY_LEVELS = [
  { value: 'low',      label: 'Sedentary',   icon: '🪑', desc: 'Little or no exercise' },
  { value: 'moderate', label: 'Moderate',    icon: '🚶', desc: 'Light exercise 1–3 days/week' },
  { value: 'high',     label: 'Very Active', icon: '🏃', desc: 'Hard exercise 4–7 days/week' },
]
const HEALTH_GOALS = [
  { value: 'weight_loss',    label: 'Lose Weight',  icon: '📉' },
  { value: 'weight_gain',    label: 'Gain Weight',  icon: '📈' },
  { value: 'healthy_living', label: 'Stay Healthy', icon: '💚' },
]

export default function EditProfile() {
  const navigate                        = useNavigate()
  const { user }                        = useAuth()
  const [profileId, setProfileId]       = useState<number | null>(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [alert, setAlert]               = useState<any>(null)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [isDragging, setIsDragging]     = useState(false)
  const fileInputRef                    = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    profile_name        : '',
    full_name           : '',
    date_of_birth       : '',
    gender              : 'male',
    weight_kg           : '',
    height_cm           : '',
    activity_level      : 'moderate',
    health_goal         : 'healthy_living',
    health_condition    : 'No Specific Condition',
    dietary_restrictions: 'Unrestricted',
  })

  useEffect(() => {
    getProfile().then(res => {
      const p = res.data.profile
      setProfileId(p.id)
      setProfileImage(p.profile_image_url || null)
      setForm({
        profile_name        : p.profile_name || 'My Profile',
        full_name           : p.full_name || '',
        date_of_birth       : p.date_of_birth || '',
        gender              : p.gender || 'male',
        weight_kg           : String(p.weight_kg) || '',
        height_cm           : String(p.height_cm) || '',
        activity_level      : p.activity_level || 'moderate',
        health_goal         : p.health_goal || 'healthy_living',
        health_condition    : p.health_condition || 'No Specific Condition',
        dietary_restrictions: p.dietary_restrictions || 'Unrestricted',
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setImageUploading(true)
    try {
      const res = await uploadProfileImage(file)
      const url = res.data.url
      setProfileImage(url)
      await updateProfileImage(url)
    } catch {
      setAlert({ isError: true, message: 'Failed to upload image.' })
    } finally { setImageUploading(false) }
  }

const handleSave = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!form.full_name || !form.date_of_birth || !form.weight_kg || !form.height_cm) {
    setAlert({ isError: true, message: 'Please fill in all required fields.' })
    return
  }
  if (!profileId) return
  setSaving(true)
  try {
    await updateProfile(profileId, {
      ...form,
      weight_kg: Number(form.weight_kg),
      height_cm: Number(form.height_cm),
    })
    // clear cache for this profile so fresh recommendations load next time
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
    if (storedUser?.id && profileId) {
      localStorage.removeItem(`cached_recommendations_${storedUser.id}_${profileId}`)
      localStorage.removeItem(`cached_targets_${storedUser.id}_${profileId}`)
    }
    setAlert({ isError: false, message: 'Profile updated successfully.' })
  } catch (err: any) {
    setAlert({ isError: true, message: err.response?.data?.error || 'Failed to save.' })
  } finally { setSaving(false) }
}

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {alert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl ${alert.isError ? 'bg-red-50' : 'bg-green-50'}`}>
              {alert.isError ? '❌' : '✅'}
            </div>
            <p className="font-bold text-gray-800 mb-1">{alert.isError ? 'Error' : 'Success'}</p>
            <p className="text-sm text-gray-500 mb-4">{alert.message}</p>
            <button
              onClick={() => { setAlert(null); if (!alert.isError) navigate('/more') }}
              className={`w-full py-2.5 rounded-xl text-white font-bold text-sm ${alert.isError ? 'bg-red-500' : 'bg-primary-600'}`}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-primary-600 px-4 pt-6 pb-5 flex items-center gap-3">
        <button onClick={() => navigate('/more')} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">←</button>
        <h1 className="text-white text-xl font-bold">Edit Profile</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center py-6 bg-white border-b border-gray-100">
        <div
          className={`relative cursor-pointer group transition-transform ${isDragging ? 'scale-105' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleImageUpload(f) }}
          onClick={() => fileInputRef.current?.click()}
        >
          {profileImage ? (
            <img src={profileImage} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-primary-100 shadow-md" />
          ) : (
            <div className="w-24 h-24 rounded-full border-4 border-primary-100 shadow-md bg-primary-50 flex items-center justify-center">
              <svg className="w-12 h-12 text-primary-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            </div>
          )}
          {!imageUploading && (
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
              <span className="text-white text-lg">📷</span>
              <span className="text-white text-[10px] font-semibold">Change</span>
            </div>
          )}
          {imageUploading && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }} />
        <p className="text-xs text-gray-400 mt-2">Click or drag & drop to change photo</p>
        <p className="text-sm font-bold text-gray-700 mt-1">@{user?.username}</p>
      </div>

      <form onSubmit={handleSave} className="p-4 space-y-4">

        {/* Profile Name */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Profile Name</label>
          <input value={form.profile_name} onChange={e => set('profile_name', e.target.value)}
            placeholder="e.g. My Profile, Grandpa John"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition" />
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-800 text-sm">Basic Information</h2>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
              placeholder="Enter full name"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date of Birth</label>
            <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gender</label>
            <div className="grid grid-cols-2 gap-3">
              {['male', 'female'].map(g => (
                <button key={g} type="button" onClick={() => set('gender', g)}
                  className={`py-3 rounded-xl text-sm font-bold capitalize border-2 transition-all ${
                    form.gender === g ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-500 border-gray-200 hover:border-primary-300'
                  }`}>
                  {g === 'male' ? '👨 Male' : '👩 Female'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-800 text-sm">Body Measurements</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Weight</label>
              <div className="relative">
                <input type="number" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)}
                  placeholder="70"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">kg</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Height</label>
              <div className="relative">
                <input type="number" value={form.height_cm} onChange={e => set('height_cm', e.target.value)}
                  placeholder="175"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">cm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Level */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-2">
          <h2 className="font-bold text-gray-800 text-sm mb-2">Activity Level</h2>
          {ACTIVITY_LEVELS.map(a => (
            <button key={a.value} type="button" onClick={() => set('activity_level', a.value)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                form.activity_level === a.value ? 'bg-primary-50 border-primary-500' : 'bg-white border-gray-200 hover:border-primary-200'
              }`}>
              <span className="text-xl">{a.icon}</span>
              <div>
                <p className={`text-sm font-bold ${form.activity_level === a.value ? 'text-primary-700' : 'text-gray-700'}`}>{a.label}</p>
                <p className="text-xs text-gray-400">{a.desc}</p>
              </div>
              {form.activity_level === a.value && (
                <div className="ml-auto w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-[10px]">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Health Goal */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-2">
          <h2 className="font-bold text-gray-800 text-sm mb-2">Health Goal</h2>
          <div className="grid grid-cols-3 gap-2">
            {HEALTH_GOALS.map(g => (
              <button key={g.value} type="button" onClick={() => set('health_goal', g.value)}
                className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all ${
                  form.health_goal === g.value ? 'bg-primary-50 border-primary-500' : 'bg-white border-gray-200 hover:border-primary-200'
                }`}>
                <span className="text-2xl mb-1">{g.icon}</span>
                <span className={`text-[10px] font-bold text-center ${form.health_goal === g.value ? 'text-primary-700' : 'text-gray-500'}`}>{g.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Health Condition */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 text-sm mb-3">Health Condition</h2>
          <div className="space-y-2">
            {HEALTH_CONDITIONS.map(c => (
              <button key={c} type="button" onClick={() => set('health_condition', c)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left text-sm transition-all ${
                  form.health_condition === c ? 'bg-primary-50 border-primary-500 text-primary-700 font-bold' : 'bg-white border-gray-200 text-gray-600 hover:border-primary-200'
                }`}>
                {c}
                {form.health_condition === c && <span className="text-primary-600">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 text-sm mb-3">Dietary Restrictions</h2>
          <select value={form.dietary_restrictions} onChange={e => set('dietary_restrictions', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition bg-white">
            {DIET_RESTRICTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <button type="submit" disabled={saving}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-colors shadow-md text-base">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
import { useEffect, useRef, useState } from 'react'
import { getProfile, createProfile, updateProfile, uploadProfileImage, updateProfileImage } from '../services/api'
import { useAuth } from '../context/AuthContext'

const ACTIVITY_LEVELS   = ['low', 'moderate', 'high']
const HEALTH_GOALS      = ['weight_loss', 'weight_gain', 'healthy_living']
const HEALTH_CONDITIONS = ['No Specific Condition', 'High Blood Pressure', 'Type 2 Diabetes', 'Heart Disease']
const DIET_RESTRICTIONS = ['Unrestricted', 'Gluten-Free', 'Egg-Free', 'Dairy & Egg Free', 'Dairy-Free']

function SelectGroup({ label, options, value, onChange }: any) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt: string) => (
          <button
            key={opt} type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors border ${
              value === opt
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-primary-400'
            }`}
          >
            {opt.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text' }: any) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition bg-white"
      />
    </div>
  )
}

function ConfirmModal({ onConfirm, onCancel }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 bg-yellow-50 rounded-full flex items-center justify-center text-3xl">⚠️</div>
        </div>
        <h3 className="text-lg font-bold text-center text-gray-800 mb-2">Logout</h3>
        <p className="text-sm text-gray-500 text-center mb-6">Are you sure you want to logout?</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 border border-gray-200 text-gray-500 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">Logout</button>
        </div>
      </div>
    </div>
  )
}

function AlertModal({ title, message, isError, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex justify-center mb-3">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl ${isError ? 'bg-red-50' : 'bg-green-50'}`}>
            {isError ? '❌' : '✅'}
          </div>
        </div>
        <h3 className="text-lg font-bold text-center text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 text-center mb-6">{message}</p>
        <button onClick={onClose} className={`w-full font-bold py-2.5 rounded-xl text-white text-sm ${isError ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-600 hover:bg-primary-700'} transition-colors`}>OK</button>
      </div>
    </div>
  )
}

export default function Profile() {
  const { user, logout }                    = useAuth()
  const [hasProfile, setHasProfile]         = useState(false)
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)
  const [targets, setTargets]               = useState<any>(null)
  const [showLogout, setShowLogout]         = useState(false)
  const [alert, setAlert]                   = useState<any>(null)
  const [username, setUsername]             = useState('')
  const [profileImage, setProfileImage]     = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [isDragging, setIsDragging]         = useState(false)
  const fileInputRef                        = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    full_name: '', age: '', gender: 'male', weight_kg: '', height_cm: '',
    activity_level: 'moderate', health_goal: 'healthy_living',
    health_condition: 'No Specific Condition', dietary_restrictions: 'Unrestricted'
  })

  useEffect(() => {
    getProfile()
      .then(res => {
        const p = res.data.profile
        setForm({
          full_name            : p.full_name || '',
          age                  : String(p.age) || '',
          gender               : p.gender || 'male',
          weight_kg            : String(p.weight_kg) || '',
          height_cm            : String(p.height_cm) || '',
          activity_level       : p.activity_level || 'moderate',
          health_goal          : p.health_goal || 'healthy_living',
          health_condition     : p.health_condition || 'No Specific Condition',
          dietary_restrictions : p.dietary_restrictions || 'Unrestricted'
        })
        setTargets(res.data.daily_targets)
        setUsername(res.data.username || '')
        setProfileImage(p.profile_image_url || null)
        setHasProfile(true)
      })
      .catch(() => setHasProfile(false))
      .finally(() => setLoading(false))
  }, [])
  

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAlert({ title: 'Error', message: 'Only image files are allowed.', isError: true })
      return
    }
    setImageUploading(true)
    try {
      const res = await uploadProfileImage(file)
      const url = res.data.url
      setProfileImage(url)
      await updateProfileImage(url)
    } catch {
      setAlert({ title: 'Error', message: 'Failed to upload image.', isError: true })
    } finally { setImageUploading(false) }
  }

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageUpload(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleImageUpload(file)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name || !form.age || !form.weight_kg || !form.height_cm) {
      setAlert({ title: 'Missing Fields', message: 'Please fill in all required fields.', isError: true })
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        age       : Number(form.age),
        weight_kg : Number(form.weight_kg),
        height_cm : Number(form.height_cm)
      }
      const res = hasProfile ? await updateProfile(payload) : await createProfile(payload)
      setTargets(res.data.daily_targets)
      setHasProfile(true)
      setAlert({ title: 'Success', message: hasProfile ? 'Profile updated successfully.' : 'Profile created successfully.', isError: false })
    } catch (err: any) {
      setAlert({ title: 'Error', message: err.response?.data?.error || 'Failed to save profile.', isError: true })
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      {showLogout && <ConfirmModal onConfirm={logout} onCancel={() => setShowLogout(false)} />}
      {alert && <AlertModal {...alert} onClose={() => setAlert(null)} />}

      {/* Header */}
      <div className="bg-primary-600 px-4 pt-6 pb-12">
        <h1 className="text-white text-xl font-bold">👤 My Profile</h1>
        <p className="text-primary-100 text-xs mt-1">{user?.email}</p>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center -mt-10 mb-2 px-4">
        <div
          className={`relative cursor-pointer group transition-transform ${isDragging ? 'scale-105' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className={`w-24 h-24 rounded-full object-cover border-4 shadow-lg transition-all ${isDragging ? 'border-primary-400 opacity-70' : 'border-white'}`}
            />
          ) : (
            <div className={`w-24 h-24 rounded-full border-4 shadow-lg flex items-center justify-center transition-all ${isDragging ? 'border-primary-400 bg-primary-50' : 'border-white bg-primary-100'}`}>
              <svg className="w-12 h-12 text-primary-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            </div>
          )}

          {/* hover overlay */}
          {!imageUploading && !isDragging && (
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
              <span className="text-white text-lg">📷</span>
              <span className="text-white text-[10px] font-semibold mt-0.5">Change</span>
            </div>
          )}

          {/* drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 rounded-full bg-primary-500/60 flex items-center justify-center">
              <span className="text-white text-xs font-bold">Drop!</span>
            </div>
          )}

          {/* uploading spinner */}
          {imageUploading && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
        <p className="text-gray-400 text-[10px] mt-2">Click or drag & drop to change photo</p>
        <p className="text-gray-700 font-bold text-sm mt-1">@{username || user?.username || '—'}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Daily targets */}
        {targets && (
          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4">
            <p className="text-primary-700 font-bold text-sm mb-3">Your Daily Targets</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Calories', value: targets.daily_calories },
                { label: 'Protein',  value: `${targets.protein_g}g` },
                { label: 'Carbs',    value: `${targets.carbs_g}g` },
                { label: 'Fat',      value: `${targets.fat_g}g` },
              ].map(n => (
                <div key={n.label} className="text-center">
                  <p className="text-primary-700 font-extrabold text-sm">{n.value}</p>
                  <p className="text-primary-400 text-[10px]">{n.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile form */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-1">
          <h2 className="font-bold text-gray-800 text-sm mb-4">Personal Information</h2>

          <InputField label="Full Name"   value={form.full_name}  onChange={(v: string) => setForm({ ...form, full_name: v })} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Age"         value={form.age}       onChange={(v: string) => setForm({ ...form, age: v })}       type="number" />
            <InputField label="Weight (kg)" value={form.weight_kg} onChange={(v: string) => setForm({ ...form, weight_kg: v })} type="number" />
          </div>
          <InputField label="Height (cm)" value={form.height_cm} onChange={(v: string) => setForm({ ...form, height_cm: v })} type="number" />

          <SelectGroup label="Gender"               options={['male', 'female']} value={form.gender}               onChange={(v: string) => setForm({ ...form, gender: v })} />
          <SelectGroup label="Activity Level"       options={ACTIVITY_LEVELS}    value={form.activity_level}       onChange={(v: string) => setForm({ ...form, activity_level: v })} />
          <SelectGroup label="Health Goal"          options={HEALTH_GOALS}       value={form.health_goal}          onChange={(v: string) => setForm({ ...form, health_goal: v })} />
          <SelectGroup label="Health Condition"     options={HEALTH_CONDITIONS}  value={form.health_condition}     onChange={(v: string) => setForm({ ...form, health_condition: v })} />
          <SelectGroup label="Dietary Restrictions" options={DIET_RESTRICTIONS}  value={form.dietary_restrictions} onChange={(v: string) => setForm({ ...form, dietary_restrictions: v })} />

          <button
            type="submit" disabled={saving}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl mt-2 transition-colors shadow-sm"
          >
            {saving ? 'Saving...' : hasProfile ? 'Update Profile' : 'Create Profile'}
          </button>
        </form>

        {/* Logout */}
        <button
          onClick={() => setShowLogout(true)}
          className="w-full border border-red-300 text-red-500 hover:bg-red-50 font-bold py-3 rounded-xl transition-colors text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
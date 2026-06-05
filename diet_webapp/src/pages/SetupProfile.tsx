import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createProfile } from '../services/api'
import { useAuth } from '../context/AuthContext'

const HEALTH_CONDITIONS = [
  'No Specific Condition', 'High Blood Pressure',
  'Type 2 Diabetes', 'Heart Disease'
]
const DIET_RESTRICTIONS = [
  'Unrestricted', 'Gluten-Free', 'Dairy & Egg Free',
  'Egg-Free', 'Dairy-Free'
]
const HEALTH_GOALS = [
  { value: 'weight_loss',    label: 'Lose Weight',    icon: '📉', desc: 'Reduce body weight healthily' },
  { value: 'weight_gain',    label: 'Gain Weight',    icon: '📈', desc: 'Build mass and muscle' },
  { value: 'healthy_living', label: 'Stay Healthy',   icon: '💚', desc: 'Maintain a balanced lifestyle' },
]
const ACTIVITY_LEVELS = [
  { value: 'low',      label: 'Sedentary',   icon: '🪑', desc: 'Little or no exercise' },
  { value: 'moderate', label: 'Moderate',    icon: '🚶', desc: 'Light exercise 1–3 days/week' },
  { value: 'high',     label: 'Very Active', icon: '🏃', desc: 'Hard exercise 4–7 days/week' },
]

export default function SetupProfile() {
  const navigate                        = useNavigate()
  const { user, setHasProfile, refreshUser } = useAuth()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const [form, setForm] = useState({
    profile_name        : 'My Profile',
    full_name           : '',
    date_of_birth       : '',
    gender              : '',
    weight_kg           : '',
    height_cm           : '',
    activity_level      : '',
    health_goal         : '',
    health_condition    : 'No Specific Condition',
    dietary_restrictions: 'Unrestricted',
  })

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    setSaving(true); setError('')
    try {
      const profileRes  = await createProfile(form)
      const updatedUser = profileRes.data?.user
      const newProfileId = profileRes.data?.profile?.id

      if (updatedUser) refreshUser(updatedUser)
      setHasProfile(true)
      localStorage.setItem('has_profile', 'true')

      // clear stale cache for this profile so Home fetches fresh recommendations
      if (user?.id && newProfileId) {
        localStorage.removeItem(`cached_recommendations_${user.id}_${newProfileId}`)
        localStorage.removeItem(`cached_targets_${user.id}_${newProfileId}`)
      }

      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save profile.')
      setSaving(false)
    }
  }

  const steps = [
    { label: 'Basic Info',  num: 1 },
    { label: 'Body Stats',  num: 2 },
    { label: 'Goals',       num: 3 },
    { label: 'Health',      num: 4 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-emerald-50 flex flex-col">

      {/* Header */}
      <div className="bg-primary-600 px-6 pt-12 pb-8 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🥗</span>
        </div>
        <h1 className="text-white text-2xl font-extrabold">You're almost there!</h1>
        <p className="text-primary-200 text-sm mt-2 max-w-xs mx-auto">
          Tell us about yourself so we can personalize your nutrition journey, {user?.username}.
        </p>
      </div>

      {/* Step indicators */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > s.num ? 'bg-primary-600 text-white' :
                  step === s.num ? 'bg-primary-600 text-white ring-4 ring-primary-100' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {step > s.num
                    ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    : s.num}
                </div>
                <span className={`text-[10px] mt-1 font-semibold ${step === s.num ? 'text-primary-600' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-8 mx-1 mb-4 ${step > s.num ? 'bg-primary-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

          {error && (
            <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {/* Step 1 — Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-extrabold text-gray-800 text-lg mb-1">Basic Information</h2>
              <p className="text-gray-400 text-sm mb-4">Tell us who this profile is for.</p>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Profile Name</label>
                <input
                  value={form.profile_name}
                  onChange={e => set('profile_name', e.target.value)}
                  placeholder="e.g. My Profile, Grandpa John"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                />
                <p className="text-xs text-gray-400 mt-1">Use a name to identify this profile (e.g. yourself, a family member)</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  value={form.full_name}
                  onChange={e => set('full_name', e.target.value)}
                  placeholder="Enter full name"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => set('date_of_birth', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                />
                <p className="text-xs text-gray-400 mt-1">We calculate your age automatically from your date of birth</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gender</label>
                <div className="grid grid-cols-2 gap-3">
                  {['male', 'female'].map(g => (
                    <button
                      key={g} type="button"
                      onClick={() => set('gender', g)}
                      className={`py-3 rounded-xl text-sm font-bold capitalize border-2 transition-all ${
                        form.gender === g
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      {g === 'male' ? '👨 Male' : '👩 Female'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Body Stats */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-extrabold text-gray-800 text-lg mb-1">Body Measurements</h2>
              <p className="text-gray-400 text-sm mb-4">Used to calculate your daily nutrition targets.</p>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Weight</label>
                <div className="relative">
                  <input
                    type="number" min="1" max="500"
                    value={form.weight_kg}
                    onChange={e => set('weight_kg', e.target.value)}
                    placeholder="e.g. 70"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">kg</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Height</label>
                <div className="relative">
                  <input
                    type="number" min="1" max="300"
                    value={form.height_cm}
                    onChange={e => set('height_cm', e.target.value)}
                    placeholder="e.g. 175"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">cm</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Activity Level</label>
                <div className="space-y-2">
                  {ACTIVITY_LEVELS.map(a => (
                    <button
                      key={a.value} type="button"
                      onClick={() => set('activity_level', a.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        form.activity_level === a.value
                          ? 'bg-primary-50 border-primary-500'
                          : 'bg-white border-gray-200 hover:border-primary-200'
                      }`}
                    >
                      <span className="text-2xl">{a.icon}</span>
                      <div>
                        <p className={`text-sm font-bold ${form.activity_level === a.value ? 'text-primary-700' : 'text-gray-700'}`}>{a.label}</p>
                        <p className="text-xs text-gray-400">{a.desc}</p>
                      </div>
                      {form.activity_level === a.value && (
                        <div className="ml-auto w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Goals */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-extrabold text-gray-800 text-lg mb-1">Your Health Goal</h2>
              <p className="text-gray-400 text-sm mb-4">What are you trying to achieve?</p>

              <div className="space-y-3">
                {HEALTH_GOALS.map(g => (
                  <button
                    key={g.value} type="button"
                    onClick={() => set('health_goal', g.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                      form.health_goal === g.value
                        ? 'bg-primary-50 border-primary-500'
                        : 'bg-white border-gray-200 hover:border-primary-200'
                    }`}
                  >
                    <span className="text-3xl">{g.icon}</span>
                    <div>
                      <p className={`font-bold text-base ${form.health_goal === g.value ? 'text-primary-700' : 'text-gray-800'}`}>{g.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{g.desc}</p>
                    </div>
                    {form.health_goal === g.value && (
                      <div className="ml-auto w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 — Health */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-extrabold text-gray-800 text-lg mb-1">Health Details</h2>
              <p className="text-gray-400 text-sm mb-4">Help us recommend safe and suitable meals for you.</p>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Health Condition</label>
                <div className="space-y-2">
                  {HEALTH_CONDITIONS.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => set('health_condition', c)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left text-sm transition-all ${
                        form.health_condition === c
                          ? 'bg-primary-50 border-primary-500 text-primary-700 font-bold'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-primary-200'
                      }`}
                    >
                      {c}
                      {form.health_condition === c && (
                        <svg className="w-4 h-4 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Dietary Restrictions</label>
                <select
                  value={form.dietary_restrictions}
                  onChange={e => set('dietary_restrictions', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition bg-white"
                >
                  {DIET_RESTRICTIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="bg-white border-t border-gray-100 px-6 py-4">
        <div className="max-w-md mx-auto flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={() => {
                if (step === 1 && (!form.full_name || !form.date_of_birth || !form.gender)) {
                  setError('Please fill in all fields.'); return
                }
                if (step === 2 && (!form.weight_kg || !form.height_cm || !form.activity_level)) {
                  setError('Please fill in all fields.'); return
                }
                if (step === 3 && !form.health_goal) {
                  setError('Please select a health goal.'); return
                }
                setError('')
                setStep(s => s + 1)
              }}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {saving ? 'Setting up...' : 'Complete Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
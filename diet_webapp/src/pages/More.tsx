import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getProfile, getAllProfiles, switchProfile, fixImageUrl } from '../services/api'

export default function More() {
  const { user, logout, refreshUser }     = useAuth()
  const navigate                          = useNavigate()
  const [profile, setProfile]             = useState<any>(null)
  const [targets, setTargets]             = useState<any>(null)
  const [showLogout, setShowLogout]       = useState(false)

  useEffect(() => {
    getProfile().then(res => {
      setProfile(res.data.profile)
      setTargets(res.data.daily_targets || null)
    }).catch(() => {})
  }, [user?.active_profile_id])

  const handleSwitch = async (id: number) => {
    try {
      await switchProfile(id)
      const updatedUser = { ...user, active_profile_id: id }
      refreshUser(updatedUser)
      navigate('/', { replace: true })
    } catch (_) {}
  }

  const GOAL_LABELS: Record<string, string> = {
    weight_loss   : 'Lose Weight',
    weight_gain   : 'Gain Weight',
    healthy_living: 'Stay Healthy',
  }
  const ACTIVITY_LABELS: Record<string, string> = {
    low     : 'Sedentary',
    moderate: 'Moderate',
    high    : 'Very Active',
  }

  const MENU_ITEMS = [
    {
      group: 'Profile',
      items: [
        { icon: '✏️', label: 'Edit Profile',   desc: 'Update your personal information',  action: () => navigate('/more/edit')     },
        { icon: '👥', label: 'Switch Profile', desc: 'Manage & switch between profiles',  action: () => navigate('/more/switch')   },
        { icon: '➕', label: 'Add Profile',    desc: 'Add a profile for a family member', action: () => navigate('/setup')         },
      ]
    },
    {
      group: 'Account',
      items: [
        { icon: '🔖', label: 'Saved Recipes',  desc: 'View your bookmarked recipes',    action: () => navigate('/more/favorites') },
        { icon: '🔐', label: 'Change Password', desc: 'Update your account password',   action: () => navigate('/more/password') },
        { icon: '🔔', label: 'Notifications',   desc: 'View your notifications',        action: () => navigate('/notifications') },
        { icon: '📊', label: 'Progress',        desc: 'View your nutrition progress',   action: () => navigate('/progress')     },
      ]
    },
  ]

  return (
    <div className="max-w-2xl mx-auto pb-8">

      {showLogout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-center text-gray-800 mb-2">Sign Out</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Are you sure you want to sign out?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogout(false)} className="flex-1 border border-gray-200 text-gray-500 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">Cancel</button>
              <button onClick={logout} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-primary-600 px-4 pt-6 pb-16">
        <h1 className="text-white text-xl font-bold">Account</h1>
        <p className="text-primary-200 text-xs mt-0.5">Manage your profile and settings</p>
      </div>

      {/* Profile card */}
      <div className="mx-4 -mt-10 bg-white rounded-2xl shadow-md border border-gray-100 p-4 flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {profile?.profile_image_url ? (
            <img src={fixImageUrl(profile.profile_image_url)!} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-primary-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-base truncate">{profile?.full_name || user?.username}</p>
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          {profile && (
            <span className="inline-block mt-1 text-[10px] bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">
              {profile.profile_name || 'My Profile'}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/more/edit')}
          className="text-xs text-primary-600 font-bold border border-primary-200 px-3 py-1.5 rounded-xl hover:bg-primary-50 transition-colors flex-shrink-0"
        >
          Edit
        </button>
      </div>

      <div className="px-4 space-y-4">

        {/* Health summary card */}
        {profile && targets && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Health Summary</p>
              <div className="flex gap-2">
                {profile.health_goal && (
                  <span className="text-[10px] bg-primary-50 text-primary-700 font-bold px-2 py-0.5 rounded-full">
                    {GOAL_LABELS[profile.health_goal] || profile.health_goal}
                  </span>
                )}
                {profile.activity_level && (
                  <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">
                    {ACTIVITY_LABELS[profile.activity_level] || profile.activity_level}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 divide-x divide-gray-50">
              {[
                { label: 'Calories', value: Math.round(targets.daily_calories || 0), unit: 'kcal', color: 'text-green-600'  },
                { label: 'Protein',  value: Math.round(targets.protein_g      || 0), unit: 'g',    color: 'text-blue-600'   },
                { label: 'Carbs',    value: Math.round(targets.carbs_g        || 0), unit: 'g',    color: 'text-yellow-600' },
                { label: 'Fat',      value: Math.round(targets.fat_g          || 0), unit: 'g',    color: 'text-red-500'    },
              ].map(n => (
                <div key={n.label} className="px-3 py-3 text-center">
                  <p className={`font-extrabold text-sm ${n.color}`}>
                    {n.value}<span className="text-[9px] font-normal text-gray-400 ml-0.5">{n.unit}</span>
                  </p>
                  <p className="text-gray-400 text-[10px] mt-0.5">{n.label}</p>
                </div>
              ))}
            </div>
            {profile.health_condition && profile.health_condition !== 'No Specific Condition' && (
              <div className="px-4 py-2.5 border-t border-gray-50 flex items-center gap-2">
                <span className="text-xs text-gray-400">Health condition:</span>
                <span className="text-xs font-semibold text-gray-600">{profile.health_condition}</span>
              </div>
            )}
            {profile.dietary_restrictions && profile.dietary_restrictions !== 'Unrestricted' && (
              <div className="px-4 py-2.5 border-t border-gray-50 flex items-center gap-2">
                <span className="text-xs text-gray-400">Diet:</span>
                <span className="text-xs font-semibold text-gray-600">{profile.dietary_restrictions}</span>
              </div>
            )}
          </div>
        )}

        {MENU_ITEMS.map(group => (
          <div key={group.group} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 pt-3 pb-1">{group.group}</p>
            {group.items.map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-t border-gray-50 text-left"
              >
                <span className="text-xl w-8 text-center">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
                <span className="text-gray-300 text-lg">›</span>
              </button>
            ))}
          </div>
        ))}

        {/* Sign out */}
        <button
          onClick={() => setShowLogout(true)}
          className="w-full flex items-center gap-3 px-4 py-4 bg-white rounded-2xl border border-red-100 hover:bg-red-50 transition-colors shadow-sm"
        >
          <span className="text-xl w-8 text-center">🚪</span>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-red-500">Sign Out</p>
            <p className="text-xs text-red-300">Sign out of your account</p>
          </div>
        </button>

        <p className="text-center text-xs text-gray-300 pb-4">Diet and Recipe v1.0.0</p>
      </div>
    </div>
  )
}
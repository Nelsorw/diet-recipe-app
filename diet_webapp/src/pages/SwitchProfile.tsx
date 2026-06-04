import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllProfiles, switchProfile, suspendProfile, fixImageUrl } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { ChevronLeftIcon, PlusIcon } from '@heroicons/react/24/outline'

export default function SwitchProfile() {
  const navigate                          = useNavigate()
  const { user, refreshUser }             = useAuth()
  const [profiles, setProfiles]           = useState<any[]>([])
  const [activeId, setActiveId]           = useState<number | null>(null)
  const [loading, setLoading]             = useState(true)
  const [switching, setSwitching]         = useState<number | null>(null)
  const [suspending, setSuspending]       = useState<number | null>(null)
  const [confirmSuspend, setConfirmSuspend] = useState<any>(null)

  const fetchProfiles = async () => {
    try {
      const res = await getAllProfiles()
      setProfiles(res.data.profiles || [])
      setActiveId(res.data.active_profile_id)
    } catch (_) {} finally { setLoading(false) }
  }

  useEffect(() => { fetchProfiles() }, [])

  const handleSwitch = async (id: number) => {
    if (id === activeId) return
    setSwitching(id)
    try {
      await switchProfile(id)
      const updatedUser = { ...user, active_profile_id: id }
      refreshUser(updatedUser)
      setActiveId(id)
      navigate('/', { replace: true })
    } catch (_) {} finally { setSwitching(null) }
  }

  const handleSuspend = async (p: any) => {
    setSuspending(p.id)
    try {
      const res = await suspendProfile(p.id)
      setProfiles(prev => prev.map(pr =>
        pr.id === p.id ? { ...pr, is_active: res.data.is_active } : pr
      ))
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update profile status.')
    } finally { setSuspending(null); setConfirmSuspend(null) }
  }

  return (
    <div className="max-w-2xl mx-auto pb-8">

      {/* Confirm suspend/reactivate modal */}
      {confirmSuspend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-center text-gray-800 mb-2">
              {confirmSuspend.is_active ? 'Suspend Profile' : 'Reactivate Profile'}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-2">
              {confirmSuspend.is_active
                ? <>Suspend <strong>{confirmSuspend.profile_name}</strong>? The profile will be inaccessible until reactivated. All data is preserved.</>
                : <>Reactivate <strong>{confirmSuspend.profile_name}</strong>? It will be accessible again.</>
              }
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmSuspend(null)}
                className="flex-1 border border-gray-200 text-gray-500 font-semibold py-2.5 rounded-xl text-sm">
                Cancel
              </button>
              <button onClick={() => handleSuspend(confirmSuspend)} disabled={suspending === confirmSuspend.id}
                className={`flex-1 font-bold py-2.5 rounded-xl text-sm text-white disabled:opacity-60 ${
                  confirmSuspend.is_active ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary-600 hover:bg-primary-700'
                }`}>
                {suspending === confirmSuspend.id
                  ? '...'
                  : confirmSuspend.is_active ? 'Suspend' : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-primary-600 px-4 pt-6 pb-5 flex items-center gap-3">
        <button onClick={() => navigate('/more')} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-white text-xl font-bold">Switch Profile</h1>
          <p className="text-primary-200 text-xs">{profiles.length} profile{profiles.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <>
            {profiles.map(p => (
              <div key={p.id} className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
                p.id === activeId ? 'border-primary-500'
                : !p.is_active ? 'border-gray-100 opacity-60'
                : 'border-gray-100'
              }`}>
                <div className="flex items-center gap-3 p-4">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${
                    p.is_active ? 'bg-primary-100' : 'bg-gray-100'
                  }`}>
                    {p.profile_image_url ? (
                      <img src={fixImageUrl(p.profile_image_url)!} alt={p.profile_name}
                        className={`w-full h-full object-cover ${!p.is_active ? 'grayscale' : ''}`} />
                    ) : (
                      <svg className={`w-6 h-6 ${p.is_active ? 'text-primary-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-800 text-sm truncate">{p.profile_name}</p>
                      {p.id === activeId && (
                        <span className="text-[10px] bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full flex-shrink-0">Active</span>
                      )}
                      {!p.is_active && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full flex-shrink-0">Suspended</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{p.full_name}</p>
                    <p className="text-xs text-gray-400">{p.age ? `${p.age} yrs` : ''} {p.gender ? `• ${p.gender}` : ''}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.id !== activeId && p.is_active && (
                      <button onClick={() => handleSwitch(p.id)} disabled={switching === p.id}
                        className="text-xs bg-primary-600 hover:bg-primary-700 text-white font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-60">
                        {switching === p.id ? '...' : 'Switch'}
                      </button>
                    )}
                    {p.id !== activeId && (
                      <button onClick={() => setConfirmSuspend(p)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors border ${
                          p.is_active
                            ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                            : 'border-primary-200 text-primary-600 hover:bg-primary-50'
                        }`}>
                        {p.is_active ? 'Suspend' : 'Reactivate'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button onClick={() => navigate('/setup')}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-primary-300 text-primary-600 font-bold hover:bg-primary-50 transition-colors">
              <PlusIcon className="w-5 h-5" /> Add New Profile
            </button>
          </>
        )}
      </div>
    </div>
  )
}

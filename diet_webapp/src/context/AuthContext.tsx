import { createContext, useContext, useEffect, useState } from 'react'
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '../services/api'
import { useNavigate } from 'react-router-dom'

interface AuthContextType {
  user: any
  token: string | null
  isLoading: boolean
  hasProfile: boolean
  setHasProfile: (val: boolean) => void
  refreshUser: (updatedUser: any) => void
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<any>(null)
  const [token, setToken]         = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState(false)
  const navigate                  = useNavigate()

  useEffect(() => {
    const stored     = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    const storedProfile = localStorage.getItem('has_profile')
    if (stored && storedUser) {
      setToken(stored)
      setUser(JSON.parse(storedUser))
      setHasProfile(storedProfile === 'true')
    }
    setIsLoading(false)
  }, [])

  /** Call this after any operation that changes active_profile_id in localStorage */
  const refreshUser = (updatedUser: any) => {
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))
  }

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password)
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    setToken(res.data.token)
    setUser(res.data.user)

    try {
      const { getProfile } = await import('../services/api')
      const profileRes = await getProfile()
      if (profileRes.data?.profile) {
        setHasProfile(true)
        localStorage.setItem('has_profile', 'true')
        navigate('/', { replace: true })
      } else {
        setHasProfile(false)
        localStorage.setItem('has_profile', 'false')
        navigate('/setup', { replace: true })
      }
    } catch {
      setHasProfile(false)
      localStorage.setItem('has_profile', 'false')
      navigate('/setup', { replace: true })
    }
  }

const register = async (username: string, email: string) => {
  const res = await apiRegister(username, email)
}

  const logout = async () => {
    try { await apiLogout() } catch (_) {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('has_profile')
    setToken(null)
    setUser(null)
    setHasProfile(false)
    navigate('/Landing', { replace: true })
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, hasProfile, setHasProfile, refreshUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
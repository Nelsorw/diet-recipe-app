import { createContext, useContext, useEffect, useState } from 'react'
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '../services/api'
import { useNavigate } from 'react-router-dom'

interface AuthContextType {
  user: any
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string) => Promise<void>  
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<any>(null)
  const [token, setToken]         = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate                  = useNavigate()

  useEffect(() => {
    const stored     = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (stored && storedUser) {
      setToken(stored)
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password)
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    setToken(res.data.token)
    setUser(res.data.user)
    navigate('/profile', { replace: true })
  }

const register = async (username: string, email: string) => {
  const res = await apiRegister(username, email)
  localStorage.setItem('token', res.data.token)
  localStorage.setItem('user', JSON.stringify(res.data.user))
  setToken(res.data.token)
  setUser(res.data.user)
  // Don't navigate — let Register page show success screen
}

  const logout = async () => {
    try { await apiLogout() } catch (_) {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    navigate('/login', { replace: true })
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
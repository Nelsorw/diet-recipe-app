import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.73:5000'

const api = axios.create({ baseURL: BASE_URL })

// Rewrites any stored image URL that still points to 127.0.0.1
// so it works when accessed from mobile or any other host.
export function fixImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  // Replace hardcoded localhost with the current backend base URL
  return url.replace(/http:\/\/127\.0\.0\.1:\d+/, BASE_URL)
            .replace(/http:\/\/localhost:\d+/, BASE_URL)
}

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401 (expired/invalid token) — clear session and redirect to landing
// Only redirect if the user was actually logged in (has a stored token).
// A 401 on the login endpoint itself is just a wrong password — don't redirect.
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const hasToken = !!localStorage.getItem('token')
      if (hasToken) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('has_profile')
        window.location.href = '/landing'
      }
    }
    return Promise.reject(err)
  }
)

// Auth
export const register = (username: string, email: string) =>
  api.post('/auth/register', { username, email })

export const changePassword   = (current: string, newPass: string) =>
  api.post('/auth/change-password', { current_password: current, new_password: newPass })

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password })

export const logout = () => api.post('/auth/logout')



// Profile
export const getProfile       = ()                   => api.get('/profile')
export const getAllProfiles    = ()                   => api.get('/profile/all')
export const createProfile    = (d: any)             => api.post('/profile', d)
export const updateProfile    = (id: number, d: any) => api.put(`/profile/${id}`, d)
export const switchProfile    = (id: number)         => api.post(`/profile/${id}/switch`)
export const deleteProfile    = (id: number)         => api.delete(`/profile/${id}`)
export const updateProfileImage = (url: string)      => api.put('/profile/image', { profile_image_url: url })


// Upload
export const uploadProfileImage = (file: File) => {
  const formData = new FormData()
  formData.append('image', file)
  return api.post('/upload/profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// Recommendations
export const getRecommendations = (params?: any) =>
  api.get('/recommendations', { params })

// Recipe detail
export const getRecipeById = (id: number) => api.get(`/recipes/${id}`)

// Meal plan
export const generateMealPlan    = ()              => api.post('/mealplan/generate?mode=weekly')
export const regenerateDayPlan   = (date: string)  => api.post(`/mealplan/regenerate-day?date=${date}`)
export const getDailyMealPlan    = (date?: string) => api.get('/mealplan/daily', { params: { date } })
export const getWeeklyMealPlan   = ()              => api.get('/mealplan/weekly')

// Logging
export const logMeal        = (d: any)       => api.post('/log', d)
export const getTodayLogs   = ()             => api.get('/log/today')
export const getLogsByDate  = (date: string) => api.get('/log/by-date', { params: { date } })
export const deleteLog      = (id: number)   => api.delete(`/log/${id}`)

// Progress
export const getProgress       = () => api.get('/progress')
export const getWeeklyProgress = () => api.get('/progress/weekly')

export const addRecipeToMealPlan = (data: { recipe_id: number; plan_date: string; replace: boolean }) =>
  api.post('/mealplan/add-recipe', data)
export const getNotifications  = ()              => api.get('/notifications')
export const markNotifRead     = (id: number)    => api.put(`/notifications/${id}/read`)
export const markAllNotifsRead = ()              => api.put('/notifications/read-all')
export const deleteNotification = (id: number)  => api.delete(`/notifications/${id}`)


export const forgotPassword  = (email: string) =>
  api.post('/auth/forgot-password', { email })

export const verifyOtp = (email: string, otp: string) =>
  api.post('/auth/verify-otp', { email, otp })

export const resetPassword = (email: string, new_password: string) =>
  api.post('/auth/reset-password', { email, new_password })

// Favorites
export const getFavorites    = ()                  => api.get('/favorites')
export const getSavedIds     = ()                  => api.get('/favorites/ids')
export const saveRecipe      = (id: number)        => api.post(`/favorites/${id}`)
export const unsaveRecipe    = (id: number)        => api.delete(`/favorites/${id}`)

// Chat
export const getChatSessions        = ()                                    => api.get('/chat/sessions')
export const createChatSession      = (title?: string)                      => api.post('/chat/sessions', { title: title || 'New Chat' })
export const renameChatSession      = (id: number, title: string)           => api.put(`/chat/sessions/${id}`, { title })
export const deleteChatSession      = (id: number)                          => api.delete(`/chat/sessions/${id}`)
export const getSessionMessages     = (id: number)                          => api.get(`/chat/sessions/${id}/messages`)
export const sendChatMessage        = (message: string, session_id?: number) => api.post('/chat/send', { message, session_id })
export const clearChatHistory       = ()                                    => api.delete('/chat/clear')

// Admin
export const adminDashboard         = ()                                    => api.get('/admin/dashboard')
export const adminSystem            = ()                                    => api.get('/admin/system')
export const adminListUsers         = (params?: any)                        => api.get('/admin/users', { params })
export const adminGetUser           = (id: number)                          => api.get(`/admin/users/${id}`)
export const adminDeleteUser        = (id: number)                          => api.delete(`/admin/users/${id}`)
export const adminToggleAdmin       = (id: number)                          => api.post(`/admin/users/${id}/toggle-admin`)
export const adminListRecipes       = (params?: any)                        => api.get('/admin/recipes', { params })
export const adminGetRecipe         = (id: number)                          => api.get(`/admin/recipes/${id}`)
export const adminAddRecipe         = (data: any)                           => api.post('/admin/recipes', data)
export const adminUpdateRecipe      = (id: number, data: any)               => api.put(`/admin/recipes/${id}`, data)
export const adminDeleteRecipe      = (id: number)                          => api.delete(`/admin/recipes/${id}`)
export const adminRecipeStats       = ()                                    => api.get('/admin/recipes/stats')
export const adminListPredictions   = (params?: any)                        => api.get('/admin/predictions', { params })
export const adminPredictionStats   = ()                                    => api.get('/admin/predictions/stats')
export const adminDemographics      = ()                                    => api.get('/admin/demographics')
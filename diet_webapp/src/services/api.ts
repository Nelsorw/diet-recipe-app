import axios from 'axios'

const BASE_URL = 'http://127.0.0.1:5000'

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

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


export const forgotPassword  = (email: string) =>
  api.post('/auth/forgot-password', { email })

export const verifyOtp = (email: string, otp: string) =>
  api.post('/auth/verify-otp', { email, otp })

export const resetPassword = (email: string, new_password: string) =>
  api.post('/auth/reset-password', { email, new_password })
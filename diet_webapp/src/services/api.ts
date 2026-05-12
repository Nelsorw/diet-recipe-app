import axios from 'axios'

const BASE_URL = 'http://127.0.0.1:5000'

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auth
export const register = (email: string, username: string, password: string) =>
  api.post('/auth/register', { email, username, password })

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password })

export const logout = () => api.post('/auth/logout')


export const updateProfileImage = (url: string) =>
  api.put('/profile/image', { profile_image_url: url })


// Profile
export const getProfile    = ()       => api.get('/profile')
export const createProfile = (d: any) => api.post('/profile', d)
export const updateProfile = (d: any) => api.put('/profile', d)

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
export const logMeal      = (d: any)     => api.post('/log', d)
export const getTodayLogs = ()           => api.get('/log/today')
export const deleteLog    = (id: number) => api.delete(`/log/${id}`)

// Progress
export const getProgress       = () => api.get('/progress')
export const getWeeklyProgress = () => api.get('/progress/weekly')

export const addRecipeToMealPlan = (data: { recipe_id: number; plan_date: string; replace: boolean }) =>
  api.post('/mealplan/add-recipe', data)
export const getNotifications  = ()              => api.get('/notifications')
export const markNotifRead     = (id: number)    => api.put(`/notifications/${id}/read`)
export const markAllNotifsRead = ()              => api.put('/notifications/read-all')

export const getVapidPublicKey  = ()     => api.get('/notifications/vapid-public-key')
export const subscribePush      = (sub: any) => api.post('/notifications/subscribe', sub)
export const unsubscribePush    = (sub: any) => api.post('/notifications/unsubscribe', sub)


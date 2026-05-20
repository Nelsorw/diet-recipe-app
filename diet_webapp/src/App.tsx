import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import RecipeDetail from './pages/RecipeDetail'
import MealPlan from './pages/MealPlan'
import LogMeal from './pages/LogMeal'
import Progress from './pages/Progress'
import Notifications from './pages/Notifications'
import More from './pages/More'
import EditProfile from './pages/EditProfile'
import SetupProfile from './pages/SetupProfile'
import SwitchProfile from './pages/SwitchProfile'
import ChangePassword from './pages/ChangePassword'
import ForgotPassword from './pages/ForgotPassword'
import Favorites from './pages/Favorites'
import AdminLayout from './admin/AdminLayout'
import Dashboard from './admin/Dashboard'
import Users from './admin/Users'
import UserDetail from './admin/UserDetail'
import Recipes from './admin/Recipes'
import RecipeEdit from './admin/RecipeEdit'
import RecipeStats from './admin/RecipeStats'
import System from './admin/System'

function ProfileGuard({ children }: { children: React.ReactNode }) {
  const { hasProfile, isLoading } = useAuth()

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )

  if (!hasProfile) return <Navigate to="/setup" replace />

  return <>{children}</>
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()
  if (isLoading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )
  return token ? <>{children}</> : <Navigate to="/landing" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()
  if (isLoading) return null
  return !token ? <>{children}</> : <Navigate to="/" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading } = useAuth()
  if (isLoading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )
  if (!token) return <Navigate to="/landing" replace />
  if (!user?.is_admin) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/landing"         element={<Landing />} />
      <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/setup"           element={<ProtectedRoute><SetupProfile /></ProtectedRoute>} />
      <Route element={
        <ProtectedRoute>
          <ProfileGuard>
            <Layout />
          </ProfileGuard>
        </ProtectedRoute>
      }>
        <Route path="/"                element={<Home />} />
        <Route path="/recipe/:id"      element={<RecipeDetail />} />
        <Route path="/mealplan"        element={<MealPlan />} />
        <Route path="/log"             element={<LogMeal />} />
        <Route path="/progress"        element={<Progress />} />
        <Route path="/notifications"   element={<Notifications />} />
        <Route path="/more"            element={<More />} />
        <Route path="/more/edit"       element={<EditProfile />} />
        <Route path="/more/switch"     element={<SwitchProfile />} />
        <Route path="/more/password"   element={<ChangePassword />} />
        <Route path="/more/favorites"  element={<Favorites />} />
      </Route>
      <Route path="*" element={<Navigate to="/landing" replace />} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index                  element={<Dashboard />} />
        <Route path="users"           element={<Users />} />
        <Route path="users/:id"       element={<UserDetail />} />
        <Route path="recipes"         element={<Recipes />} />
        <Route path="recipes/:id"     element={<RecipeEdit />} />
        <Route path="stats"           element={<RecipeStats />} />
        <Route path="system"          element={<System />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
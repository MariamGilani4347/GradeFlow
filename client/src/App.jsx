import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Signup from './pages/Signup'
import Login from './pages/Login'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import Sessions from './pages/Sessions'
import Analytics from './pages/Analytics'
import Notifications from './pages/Notifications'
import AdminLogin from './pages/AdminLogin'
import AdminPanel from './pages/AdminPanel'
import LandingPage from './pages/LandingPage'
import RubricManager from './pages/Rubricmanager'   // ← ADD THIS
import ForgotPassword from './pages/Forgotpassword'

const ProtectedRoute = ({ children }) => {
  const { accessToken } = useAuth()
  return accessToken ? children : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Landing page — first thing users see */}
      <Route path="/" element={<LandingPage />} />

      {/* Teacher auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Teacher dashboard (protected) */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/sessions" element={
        <ProtectedRoute>
          <Dashboard>
            <Sessions />
          </Dashboard>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/analytics" element={
        <ProtectedRoute>
          <Dashboard>
            <Analytics />
          </Dashboard>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/notifications" element={
        <ProtectedRoute>
          <Dashboard>
            <Notifications />
          </Dashboard>
        </ProtectedRoute>
      } />

      {/* ← ADD THIS ROUTE */}
      <Route path="/dashboard/rubrics" element={
        <ProtectedRoute>
          <RubricManager />
        </ProtectedRoute>
      } />

      {/* Admin auth (separate from teacher) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminPanel />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
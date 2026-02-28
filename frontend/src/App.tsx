import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import { ModalProvider } from './context/ModalContext'
import Login from './pages/Login'
import Register from './pages/Register'
import LicenseCheck from './pages/LicenseCheck'
import Dashboard from './pages/Dashboard'
import CompanyAdminDashboard from './pages/CompanyAdminDashboard'
import CompanyAdminProfile from './pages/CompanyAdminProfile'
import SpreadsheetsList from './pages/SpreadsheetsList'
import SpreadsheetView from './pages/SpreadsheetView'
import MinitabView from './pages/MinitabView'
import Profile from './pages/Profile'
import Subscriptions from './pages/Subscriptions'
import ProtectedRoute from './components/ProtectedRoute'
import { CompanyAdminRoute, CompanyRoute } from './components/RoleProtectedRoute'
import Layout from './components/Layout'
import MinitabLayout from './components/MinitabLayout'

// New Company Admin Layout and Pages
import CompanyAdminLayout from './components/CompanyAdminLayout'
import AdminDashboard from './pages/company-admin/Dashboard'
import UserManagement from './pages/company-admin/UserManagement'
import RolesManagement from './pages/company-admin/RolesManagement'
import AdminSpreadsheets from './pages/company-admin/Spreadsheets'
import AnalysisList from './pages/company-admin/Analysis'
import CompanyProfile from './pages/company-admin/CompanyProfile'
import AdminSubscription from './pages/company-admin/Subscription'

import { hasLicenseCheckPassed } from './utils/licenseCheck'
import { useProactiveTokenRefresh } from './hooks/useProactiveTokenRefresh'

// Smart redirect component that sends users to their appropriate dashboard
function DashboardRedirect() {
  const { user, isCompanyAdmin, isCompanyUser } = useAuthStore()

  if (!user) return <Navigate to="/login" />
  if (isCompanyAdmin()) {
    if (!hasLicenseCheckPassed()) return <Navigate to="/license-check" replace />
    return <Navigate to="/company-admin" replace />
  }
  if (isCompanyUser()) return <Navigate to="/dashboard" replace />
  return <Navigate to="/dashboard" replace />
}

function App() {
  const { isAuthenticated } = useAuthStore()
  useProactiveTokenRefresh()

  return (
    <Router>
      <Toaster position="top-right" />
      <ModalProvider>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={isAuthenticated ? <DashboardRedirect /> : <Login />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <DashboardRedirect /> : <Register />}
          />
          <Route
            path="/license-check"
            element={isAuthenticated ? <LicenseCheck /> : <Navigate to="/login" />}
          />

          {/* Company Admin Routes - New Sidebar Layout */}
          <Route
            path="/company-admin"
            element={
              <CompanyAdminRoute>
                <CompanyAdminLayout />
              </CompanyAdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="roles" element={<RolesManagement />} />
            <Route path="spreadsheets" element={<AdminSpreadsheets />} />
            <Route path="spreadsheet/:id" element={<SpreadsheetView />} />
            <Route path="analysis" element={<AnalysisList />} />
            <Route path="company" element={<CompanyProfile />} />
            <Route path="subscription" element={<AdminSubscription />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Legacy Company Admin Profile Route - redirect to new */}
          <Route
            path="/company-admin-legacy"
            element={<Navigate to="/company-admin" replace />}
          />

          {/* Company User Routes (both admin and regular users) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardRedirect />} />
            
            {/* Dashboard - Excel Center Interface */}
            <Route 
              path="dashboard" 
              element={
                <CompanyRoute>
                  <Dashboard />
                </CompanyRoute>
              } 
            />
            
            {/* Spreadsheets List - Company members only */}
            <Route 
              path="spreadsheets" 
              element={
                <CompanyRoute>
                  <SpreadsheetsList />
                </CompanyRoute>
              } 
            />
            
            {/* Spreadsheet Routes - Company members only */}
            <Route 
              path="spreadsheet/:id" 
              element={
                <CompanyRoute>
                  <SpreadsheetView />
                </CompanyRoute>
              } 
            />
            
            {/* Subscriptions - Company members only */}
            <Route 
              path="subscriptions" 
              element={
                <CompanyRoute>
                  <Subscriptions />
                </CompanyRoute>
              } 
            />
            
            {/* Profile - All authenticated users */}
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Minitab View Routes */}
          <Route
            path="/minitab"
            element={
              <ProtectedRoute>
                <MinitabLayout />
              </ProtectedRoute>
            }
          >
            <Route 
              path="spreadsheet/:id" 
              element={
                <CompanyRoute>
                  <MinitabView />
                </CompanyRoute>
              } 
            />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Catch all - redirect to appropriate dashboard */}
          <Route 
            path="*" 
            element={isAuthenticated ? <DashboardRedirect /> : <Navigate to="/login" />} 
          />
        </Routes>
      </ModalProvider>
    </Router>
  )
}

export default App


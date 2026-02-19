import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import { ModalProvider } from './context/ModalContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import SuperAdminLayout from './components/SuperAdminLayout'
import SuperAdminHome from './pages/SuperAdminHome'
import SuperAdminAllCompany from './pages/SuperAdminAllCompany'
import SuperAdminUserLicense from './pages/SuperAdminUserLicense'
import SuperAdminLicenseDetail from './pages/SuperAdminLicenseDetail'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import CompanyAdminDashboard from './pages/CompanyAdminDashboard'
import CompanyAdminProfile from './pages/CompanyAdminProfile'
import CompanyDetails from './pages/CompanyDetails'
import SpreadsheetsList from './pages/SpreadsheetsList'
import SpreadsheetView from './pages/SpreadsheetView'
import MinitabView from './pages/MinitabView'
import Profile from './pages/Profile'
import Subscriptions from './pages/Subscriptions'
import ProtectedRoute from './components/ProtectedRoute'
import { SuperAdminRoute, CompanyAdminRoute, CompanyRoute } from './components/RoleProtectedRoute'
import Layout from './components/Layout'
import MinitabLayout from './components/MinitabLayout'

// Smart redirect component that sends users to their appropriate dashboard
function DashboardRedirect() {
  const { user, isSuperAdmin, isCompanyAdmin, isCompanyUser } = useAuthStore()

  if (!user) return <Navigate to="/login" />
  
  if (isSuperAdmin()) return <Navigate to="/super-admin" replace />
  if (isCompanyAdmin()) return <Navigate to="/company-admin" replace />
  if (isCompanyUser()) return <Navigate to="/dashboard" replace />
  
  // Fallback
  return <Navigate to="/dashboard" replace />
}

function App() {
  const { isAuthenticated } = useAuthStore()

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

          {/* Super Admin Routes – layout with sidebar + header (QSSENCE style) */}
          <Route
            path="/super-admin"
            element={
              <SuperAdminRoute>
                <SuperAdminLayout />
              </SuperAdminRoute>
            }
          >
            <Route index element={<SuperAdminHome />} />
            <Route path="company/all-company" element={<SuperAdminAllCompany />} />
            <Route path="company/user-license" element={<SuperAdminUserLicense />} />
            <Route path="company/user-license/view/:id" element={<SuperAdminLicenseDetail />} />
            <Route path="companies/:id" element={<CompanyDetails />} />
            <Route path="companies/:id/edit" element={<CompanyDetails />} />
            <Route path="plans" element={<SuperAdminHome />} />
            <Route path="subscriptions" element={<SuperAdminHome />} />
            <Route path="transactions" element={<SuperAdminHome />} />
            <Route path="settings" element={<SuperAdminHome />} />
          </Route>

          {/* Company Admin Routes */}
          <Route
            path="/company-admin"
            element={
              <CompanyAdminRoute>
                <CompanyAdminDashboard />
              </CompanyAdminRoute>
            }
          />
          <Route
            path="/company-admin/profile"
            element={
              <CompanyAdminRoute>
                <CompanyAdminProfile />
              </CompanyAdminRoute>
            }
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


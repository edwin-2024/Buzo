import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

import { AdminLayout } from '@/components/layout/admin-layout'

import { LoginPage } from '@/pages/login'
import { DashboardPage } from '@/pages/dashboard'
import { StopsPage } from '@/pages/stops'
import { BusesPage } from '@/pages/buses'
import { DriversPage } from '@/pages/drivers'
import { RoutesPage } from '@/pages/routes'
import { TripsPage } from '@/pages/trips'
import { BookingsPage } from '@/pages/bookings'
import { LiveMapPage } from '@/pages/live-map'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} 
      />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="stops" element={<StopsPage />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="buses" element={<BusesPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="trips" element={<TripsPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="live-map" element={<LiveMapPage />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

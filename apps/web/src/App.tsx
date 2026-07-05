import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { HomePage } from '@/pages/home'
import { SearchPage } from '@/pages/search'
import { BookingPage } from '@/pages/booking'
import { MyBookingsPage } from '@/pages/my-bookings'
import { TrackPage } from '@/pages/track'
import { LoginPage } from '@/pages/login'
import { RegisterPage } from '@/pages/register'
import { PaymentPage } from '@/pages/payment'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="booking/:tripId" element={<BookingPage />} />
        <Route path="my-bookings" element={<MyBookingsPage />} />
        <Route path="track" element={<TrackPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="payment" element={<PaymentPage />} />
      </Route>
    </Routes>
  )
}

export default App

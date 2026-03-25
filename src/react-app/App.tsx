import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "@getmocha/users-service/react";
import HomePage from "@/react-app/pages/Home";
import LocationsPage from "@/react-app/pages/Locations";
import LocationDetailPage from "@/react-app/pages/LocationDetail";
import NearMePage from "@/react-app/pages/NearMe";
import BookingWizardPage from "@/react-app/pages/BookingWizard";
import MyBookingsPage from "@/react-app/pages/MyBookings";
import BookingDetailPage from "@/react-app/pages/BookingDetail";
import AuthCallbackPage from "@/react-app/pages/AuthCallback";
import ProfilePage from "@/react-app/pages/Profile";
import AdminDashboard from "@/react-app/pages/admin/Dashboard";
import AdminLocations from "@/react-app/pages/admin/Locations";
import AdminPods from "@/react-app/pages/admin/Pods";
import AdminBookings from "@/react-app/pages/admin/Bookings";
import AdminMembers from "@/react-app/pages/admin/Members";
import AdminMemberships from "@/react-app/pages/admin/Memberships";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/near-me" element={<NearMePage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/locations/:locationId" element={<LocationDetailPage />} />
          <Route path="/book" element={<BookingWizardPage />} />
          <Route path="/book/:locationId" element={<BookingWizardPage />} />
          <Route path="/book/:locationId/:podId" element={<BookingWizardPage />} />
          <Route path="/bookings" element={<MyBookingsPage />} />
          <Route path="/bookings/:id" element={<BookingDetailPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/locations" element={<AdminLocations />} />
          <Route path="/admin/pods" element={<AdminPods />} />
          <Route path="/admin/bookings" element={<AdminBookings />} />
          <Route path="/admin/members" element={<AdminMembers />} />
          <Route path="/admin/memberships" element={<AdminMemberships />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

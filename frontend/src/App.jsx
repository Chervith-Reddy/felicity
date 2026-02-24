import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';

// Participant Pages
import ParticipantDashboard from './pages/participant/Dashboard';
import BrowseEvents from './pages/participant/BrowseEvents';
import EventDetail from './pages/participant/EventDetail';
import TicketPage from './pages/participant/TicketPage';
import ClubsPage from './pages/participant/ClubsPage';
import OrganizerDetailPage from './pages/participant/OrganizerDetail';
import ParticipantProfile from './pages/participant/Profile';
import TeamPage from './pages/participant/TeamPage';

// Organizer Pages
import OrganizerDashboard from './pages/organizer/Dashboard';
import CreateEvent from './pages/organizer/CreateEvent';
import EditEvent from './pages/organizer/EditEvent';
import EventParticipants from './pages/organizer/EventParticipants';
import OrganizerProfile from './pages/organizer/Profile';
import OngoingEvents from './pages/organizer/OngoingEvents';
import AttendanceScanner from './pages/organizer/AttendanceScanner';
import PaymentApprovals from './pages/organizer/PaymentApprovals';
import EventFeedback from './pages/organizer/EventFeedback';
import OrganizerEventDetail from './pages/organizer/EventDetail';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageOrganizers from './pages/admin/ManageOrganizers';
import ManageUsers from './pages/admin/ManageUsers';
import PasswordResetRequests from './pages/admin/PasswordResetRequests';

import Layout from './components/common/Layout';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (user.role === 'participant' && !user.onboardingCompleted && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
};

const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/admin" />;
  if (user.role === 'organizer') return <Navigate to="/organizer" />;
  return <Navigate to="/dashboard" />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<RoleRedirect />} />

          <Route path="/onboarding" element={
            <ProtectedRoute roles={['participant']}><OnboardingPage /></ProtectedRoute>
          } />

          {/* Participant */}
          <Route path="/dashboard" element={<ProtectedRoute roles={['participant']}><Layout><ParticipantDashboard /></Layout></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute roles={['participant']}><Layout><BrowseEvents /></Layout></ProtectedRoute>} />
          <Route path="/events/:id" element={<ProtectedRoute roles={['participant']}><Layout><EventDetail /></Layout></ProtectedRoute>} />
          <Route path="/tickets/:ticketId" element={<ProtectedRoute roles={['participant']}><Layout><TicketPage /></Layout></ProtectedRoute>} />
          <Route path="/clubs" element={<ProtectedRoute roles={['participant']}><Layout><ClubsPage /></Layout></ProtectedRoute>} />
          <Route path="/clubs/:id" element={<ProtectedRoute roles={['participant']}><Layout><OrganizerDetailPage /></Layout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute roles={['participant']}><Layout><ParticipantProfile /></Layout></ProtectedRoute>} />
          <Route path="/teams/:id" element={<ProtectedRoute roles={['participant']}><Layout><TeamPage /></Layout></ProtectedRoute>} />

          {/* Organizer */}
          <Route path="/organizer" element={<ProtectedRoute roles={['organizer']}><Layout><OrganizerDashboard /></Layout></ProtectedRoute>} />
          <Route path="/organizer/events/create" element={<ProtectedRoute roles={['organizer']}><Layout><CreateEvent /></Layout></ProtectedRoute>} />
          <Route path="/organizer/events/:id" element={<ProtectedRoute roles={['organizer']}><Layout><OrganizerEventDetail /></Layout></ProtectedRoute>} />
          <Route path="/organizer/events/:id/edit" element={<ProtectedRoute roles={['organizer']}><Layout><EditEvent /></Layout></ProtectedRoute>} />
          <Route path="/organizer/events/:id/participants" element={<ProtectedRoute roles={['organizer']}><Layout><EventParticipants /></Layout></ProtectedRoute>} />
          <Route path="/organizer/events/:id/attendance" element={<ProtectedRoute roles={['organizer']}><Layout><AttendanceScanner /></Layout></ProtectedRoute>} />
          <Route path="/organizer/events/:id/payments" element={<ProtectedRoute roles={['organizer']}><Layout><PaymentApprovals /></Layout></ProtectedRoute>} />
          <Route path="/organizer/events/:id/feedback" element={<ProtectedRoute roles={['organizer']}><Layout><EventFeedback /></Layout></ProtectedRoute>} />
          <Route path="/organizer/ongoing" element={<ProtectedRoute roles={['organizer']}><Layout><OngoingEvents /></Layout></ProtectedRoute>} />
          <Route path="/organizer/profile" element={<ProtectedRoute roles={['organizer']}><Layout><OrganizerProfile /></Layout></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
          <Route path="/admin/organizers" element={<ProtectedRoute roles={['admin']}><Layout><ManageOrganizers /></Layout></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><Layout><ManageUsers /></Layout></ProtectedRoute>} />
          <Route path="/admin/password-resets" element={<ProtectedRoute roles={['admin']}><Layout><PasswordResetRequests /></Layout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

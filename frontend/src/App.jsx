import React, { useContext } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import UserLogin from './pages/UserLogin';
import UserSignUp from './pages/UserSignUp';
import CaptainLogin from './pages/CaptainLogin';
import CaptainSignup from './pages/CaptainSignup';
import UserDashboard from './pages/UserDashboard';
import CaptainDashboard from './pages/CaptainDashboard';
import Map from './pages/Map';
import Chat from './pages/Chat';
import BookRide from './pages/BookRide';
import Notification from './pages/Notification';
import Settings from './pages/Settings';
import { UserDataContext } from './context/UserContext';
import UserContext from './context/UserContext';
import TripContextProvider from './context/TripContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import BottomNav from './components/BottomNav';
import NotFound from './pages/NotFound';

const AppLayout = () => {
  const { user } = useContext(UserDataContext);
  const location = useLocation();
  const showBottomNav =
    (user?.role === 'user' || user?.role === 'captain') && location.pathname !== '/';

  return (
    <ErrorBoundary>
      <div
        className={`min-h-screen flex flex-col ${showBottomNav ? 'pb-16 md:pb-20' : ''}`}
        role="main"
        aria-label="Main application content"
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<UserLogin />} />
          <Route path="/signup" element={<UserSignUp />} />
          <Route path="/captain-login" element={<CaptainLogin />} />
          <Route path="/captain-signup" element={<CaptainSignup />} />
          <Route
            path="/user/dashboard"
            element={
              <ProtectedRoute role="user">
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/captain/dashboard"
            element={
              <ProtectedRoute role="captain">
                <CaptainDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/map"
            element={
              <ProtectedRoute role="user">
                <Map role="user" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/captain/map"
            element={
              <ProtectedRoute role="captain">
                <Map role="captain" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/chat"
            element={
              <ProtectedRoute role="user">
                <Chat role="user" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/captain/chat"
            element={
              <ProtectedRoute role="captain">
                <Chat role="captain" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/book-ride"
            element={
              <ProtectedRoute role="user">
                <TripContextProvider>
                  <BookRide />
                </TripContextProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notification />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings role={user?.role || 'user'} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {showBottomNav && <BottomNav />}
        <Toaster position="top-center" richColors />
      </div>
    </ErrorBoundary>
  );
};

const App = () => {
  return (
    <UserContext>
      <TripContextProvider>
        <AppLayout />
      </TripContextProvider>
    </UserContext>
  );
};

export default App;
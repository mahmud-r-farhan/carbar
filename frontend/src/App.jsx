import React from 'react';
import { Route, Routes } from 'react-router-dom';
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
import UserContext from './context/UserContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'sonner';
import BottomNav from './components/BottomNav';
import Settings from './pages/Settings';
import ErrorBoundary from './components/ErrorBoundary';

const App = () => {
  return (
    <ErrorBoundary>
      <UserContext>
        <Toaster richColors position="top-right" />
        <div className="pb-16 min-h-screen">
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
                  <BookRide />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute role="user">
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/captain/settings"
              element={
                <ProtectedRoute role="captain">
                  <Settings role="captain" />
                </ProtectedRoute>
              }
            />
          </Routes>
          <BottomNav />
        </div>
      </UserContext>
    </ErrorBoundary>
  );
};

export default App;
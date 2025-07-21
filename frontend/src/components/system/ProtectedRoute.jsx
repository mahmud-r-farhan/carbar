import React, { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { UserDataContext } from '../../context/UserContext';
import Loading from '../ui/Loading';
import { toast } from 'sonner';

const ProtectedRoute = ({ children, role, roles }) => {
  const { user, setUser, loading } = useContext(UserDataContext);
  const [isValidating, setIsValidating] = useState(loading);
  const [isValid, setIsValid] = useState(null);

  useEffect(() => {
    if (!user?.token || loading) {
      setIsValidating(loading);
      return;
    }

    // Validate token with backend
    const validateToken = async () => {
      try {
        const endpoint = user.role === 'captain' ? '/captain/profile' : '/user/profile';
        const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Token validation failed: ${response.statusText}`);
        }

        setIsValid(true);
      } catch (error) {
        console.error('ProtectedRoute - Token validation failed:', error.message);
        setUser(null);
        localStorage.removeItem('user'); // Changed from 'token' to 'user'
        toast.error('Session expired. Please log in again.');
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [user, setUser, loading]);

  if (isValidating || loading) {
    return <Loading aria-label="Verifying authentication" />;
  }

  if (!user?._id || !user?.token || isValid === false) {
    const redirectTo = role === 'captain' ? '/captain-login' : '/login';
    console.log('ProtectedRoute - Redirecting: No user ID, token, or invalid token', { redirectTo });
    return <Navigate to={redirectTo} replace />;
  }

  // Check if user's role is allowed
  const isAuthorized = roles
    ? roles.includes(user.role)
    : role
      ? user.role === role
      : true;

  if (!isAuthorized) {
    console.log(`ProtectedRoute - Redirecting: Role mismatch (user.role=${user.role}, required=${role || roles})`);
    const redirectTo = roles ? '/' : role === 'captain' ? '/captain-login' : '/login';
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;
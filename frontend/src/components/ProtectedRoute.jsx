import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { UserDataContext } from '../context/UserContext';
import Loading from '../components/Loading';

const ProtectedRoute = ({ children, role }) => {
  const [user, , , loading] = useContext(UserDataContext);

  console.log('ProtectedRoute - User:', user, 'Required Role:', role, 'Loading:', loading);

  if (loading) {
    console.log('ProtectedRoute - Waiting for auth verification');
    return <Loading />;
  }

  if (!user._id || !user.token) {
    console.log('ProtectedRoute - Redirecting: No user ID or token');
    return <Navigate to={role === 'user' ? '/login' : '/captain-login'} replace />;
  }

  if (user.role !== role) {
    console.log(`ProtectedRoute - Redirecting: Role mismatch (user.role=${user.role}, required=${role})`);
    return <Navigate to={role === 'user' ? '/login' : '/captain-login'} replace />;
  }

  return children;
};

export default ProtectedRoute;
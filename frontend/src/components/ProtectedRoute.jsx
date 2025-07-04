import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { UserDataContext } from '../context/UserContext';

const ProtectedRoute = ({ children, role }) => {
  const [user] = useContext(UserDataContext);

  if (!user.token || user.role !== role) {
    return <Navigate to={role === 'user' ? '/login' : '/captain-login'} />;
  }

  return children;
};

export default ProtectedRoute;
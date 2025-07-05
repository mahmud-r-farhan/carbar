import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

export const UserDataContext = createContext();

const UserContext = ({ children }) => {
  const [user, setUser] = useState({
    email: '',
    fullname: { firstName: '', lastName: '' },
    role: '',
    token: '',
    verified: false,
    profileImage: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);

          const endpoint = userData.role === 'user' ? '/user/profile' : '/captain/profile';
          await axios.get(`${import.meta.env.VITE_API_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${userData.token}` },
            withCredentials: true,
          });
        }
      } catch (error) {
        localStorage.removeItem('user');
        setUser({
          email: '',
          fullname: { firstName: '', lastName: '' },
          role: '',
          token: '',
          verified: false,
          profileImage: '',
        });
        toast.error('Session expired. Please log in again.');
      } finally {
        setLoading(false);
      }
    };
    verifyAuth();
  }, []);

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <UserDataContext.Provider value={[user, updateUser]}>
      {children}
    </UserDataContext.Provider>
  );
};

export default UserContext;
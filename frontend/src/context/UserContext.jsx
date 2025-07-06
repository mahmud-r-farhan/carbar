import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import Loading from '../components/Loading';

export const UserDataContext = createContext();

const UserContext = ({ children }) => {
  const [user, setUser] = useState({
    _id: '',
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
          if (!userData._id || !userData.token) {
            throw new Error('Invalid user data in localStorage');
          }
          setUser(userData);

          const endpoint = userData.role === 'user' ? '/user/profile' : '/captain/profile';
          const response = await axios.get(`${import.meta.env.VITE_API_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${userData.token}` },
            withCredentials: true,
          });

          const updatedUser = { ...userData, ...response.data };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } catch (error) {
        console.error('Auth verification failed:', error.message);
        localStorage.removeItem('user');
        setUser({
          _id: '',
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
    if (userData._id && userData.token) {
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      console.warn('Invalid user data, not updating:', userData);
    }
  };

 const login = async (email, password, role = 'user') => {
  try {
    const endpoint = role === 'captain' ? '/captain/login' : '/user/login';
    const response = await axios.post(`${import.meta.env.VITE_API_URL}${endpoint}`, { email, password });

    const userData = {
      _id: response.data._id,
      email: response.data.email,
      fullname: response.data.fullname,
      role: response.data.role,
      token: response.data.token,
      verified: response.data.verified,
      profileImage: response.data.profileImage || '',
    };

    localStorage.setItem('user', JSON.stringify(userData));
    updateUser(userData);
    toast.success('Login successful');
    return userData;
  } catch (err) {
    console.error('Login failed:', err);
    toast.error(err.response?.data?.message || 'Login failed');
    throw err;
  }
};


  if (loading) {
    return (
      < Loading />
    );
  }

  return (
    <UserDataContext.Provider value={[user, updateUser, login]}>
      {children}
    </UserDataContext.Provider>
  );
};

export default UserContext;
import React, { createContext, useState, useEffect } from 'react';
import axios from '../services/axios';
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
        console.log('verifyAuth - Stored user:', storedUser);
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          if (!userData._id) {
            throw new Error('Invalid user data in localStorage');
          }
          setUser(userData);
          console.log('verifyAuth - User state set:', userData);
          try {
            const endpoint = userData.role === 'user' ? '/user/profile' : '/captain/profile';
            const response = await axios.get(`${import.meta.env.VITE_API_URL}${endpoint}`, {
              headers: userData.token ? { Authorization: `Bearer ${userData.token}` } : {},
              withCredentials: true,
            });
            console.log('verifyAuth - Profile API response:', response.data);
            const updatedUser = { ...userData, ...response.data };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          } catch (profileError) {
            console.warn('verifyAuth - Profile fetch failed:', profileError.response?.data || profileError.message);
          }
        }
      } catch (error) {
        console.error('verifyAuth - Failed:', error.response?.data || error.message);
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
    if (userData._id) {
      console.log('updateUser - Updating user:', userData);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      console.warn('updateUser - Invalid user data:', userData);
    }
  };

  const login = async (email, password, role = 'user') => {
    try {
      const endpoint = role === 'captain' ? '/captain/login' : '/user/login';
      const response = await axios.post(`${import.meta.env.VITE_API_URL}${endpoint}`, { email, password }, {
        withCredentials: true,
      });
      console.log('login - API response:', response.data);
      const userData = {
        _id: response.data.user?._id || response.data._id,
        email: response.data.user?.email || response.data.email,
        fullname: response.data.user?.fullname || response.data.fullname || { firstName: '', lastName: '' },
        role: response.data.user?.role || response.data.role || role,
        token: response.data.token || '',
        verified: response.data.user?.verified || response.data.verified || false,
        profileImage: response.data.user?.profileImage || response.data.profileImage || '',
      };
      if (!userData._id) {
        throw new Error('Invalid user data: _id is missing');
      }
      console.log('login - Storing userData:', userData);
      localStorage.setItem('user', JSON.stringify(userData));
      updateUser(userData);
      toast.success('Login successful');
      return userData;
    } catch (err) {
      console.error('login - Failed:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Login failed');
      throw err;
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <UserDataContext.Provider value={[user, updateUser, login, loading]}>
      {children}
    </UserDataContext.Provider>
  );
};

export default UserContext;
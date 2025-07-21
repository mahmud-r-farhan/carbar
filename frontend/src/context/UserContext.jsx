import React, { createContext, useState, useEffect } from 'react';
import axios from '../services/axios';
import { toast } from 'sonner';
import Loading from '../components/ui/Loading';

export const UserDataContext = createContext();

const UserContext = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          setLoading(false);
          return;
        }

        const userData = JSON.parse(storedUser);
        if (!userData?._id || !userData?.token) {
          throw new Error('Invalid user data in localStorage');
        }

        const endpoint = userData.role === 'captain' ? '/captain/profile' : '/user/profile';
        const response = await axios.get(`${import.meta.env.VITE_API_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${userData.token}` },
          withCredentials: true,
          timeout: 5000,
        });

        // Handle different profile data structures
        const profileData = userData.role === 'captain' ? (response.data.captain || response.data) : (response.data.user || response.data);
        if (!profileData?._id) {
          throw new Error('Invalid profile data from server');
        }

        const updatedUser = {
          _id: profileData._id,
          email: profileData.email,
          fullname: profileData.fullname || { firstName: '', lastName: '' },
          role: profileData.role || userData.role,
          token: userData.token,
          verified: profileData.verified || false,
          profileImage: profileData.profileImage || '',
          socketId: profileData.socketId || null,
        };

        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (error) {
        localStorage.removeItem('user');
        setUser(null);
        toast.error(error.response?.data?.message || 'Session expired. Please log in again.');
      } finally {
        setLoading(false);
      }
    };
    verifyAuth();
  }, []);

  const login = async (email, password, role = 'user') => {
    try {
      const endpoint = role === 'captain' ? '/captain/login' : '/user/login';
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        { email, password },
        { withCredentials: true, timeout: 10000 }
      );

      // Handle different response structures based on role
      let userData, token;
      if (role === 'captain') {
        userData = response.data.captain;
        token = response.data.token;
      } else {
        userData = response.data.user || response.data;
        token = response.data.token;
      }

      if (!userData?._id || !token) {
        throw new Error('Invalid user data from server: missing _id or token');
      }

      const validateEndpoint = role === 'captain' ? '/captain/profile' : '/user/profile';
      const validateResponse = await axios.get(`${import.meta.env.VITE_API_URL}${validateEndpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
        timeout: 5000,
      });

      const profileData = role === 'captain' ? (validateResponse.data.captain || validateResponse.data) : (validateResponse.data.user || validateResponse.data);
      if (!profileData?._id) {
        throw new Error('Token validation failed: invalid profile data');
      }

      const newUser = {
        _id: userData._id,
        email: userData.email,
        fullname: userData.fullname || { firstName: '', lastName: '' },
        role: userData.role || role,
        token,
        verified: userData.verified || false,
        profileImage: userData.profileImage || '',
        socketId: userData.socketId || null,
      };

      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      toast.success('Login successful');

      if ('serviceWorker' in navigator && 'PushManager' in window) {
        subscribeToPush();
      }

      return newUser;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
      if (error.code === 'ECONNABORTED') {
        toast.error('Request timed out. Please check your connection and try again.');
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again later or contact support.');
      } else if (error.response?.status === 401) {
        toast.error('Invalid email or password.');
      } else {
        throw new Error(errorMessage);
      }
    }
  };

  const logout = async () => {
    if (!user?._id || !user?.token) {
      setUser(null);
      localStorage.removeItem('user');
      toast.success('Logged out successfully');
      return;
    }

    try {
      const endpoint = user.role === 'captain' ? '/captain/logout' : '/user/logout';
      await axios.get(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${user.token}` },
        withCredentials: true,
        timeout: 5000,
      });
      setUser(null);
      localStorage.removeItem('user');
      toast.success('Logged out successfully');
    } catch (error) {
     toast.error(error.response?.data?.message || 'Logout failed');
    }
  };

  async function subscribeToPush() {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return;
      const userData = JSON.parse(storedUser);
      const token = userData?.token;
      if (!token) return;

      const reg = await navigator.serviceWorker.ready;
      const res = await fetch(`${import.meta.env.VITE_API_URL}/vapid-public-key`);
      if (!res.ok) throw new Error(`Failed to fetch VAPID public key: ${res.statusText}`);
      const { publicKey } = await res.json();
      if (!publicKey) throw new Error('VAPID public key is missing');
      const convertedKey = urlBase64ToUint8Array(publicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
      await fetch(`${import.meta.env.VITE_API_URL}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subscription),
        credentials: 'include',
      });
    } catch (err) {
      // Removed console.error for production
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  if (loading) {
    return <Loading aria-label="Loading user authentication" />;
  }

  return (
    <UserDataContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </UserDataContext.Provider>
  );
};

export default UserContext;
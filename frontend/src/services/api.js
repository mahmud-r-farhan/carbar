import axios from './axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const userApi = {
  register: async (data) => {
    const response = await axios.post(`${API_URL}/user/register`, data);
    return response.data;
  },

  verifyOTP: async (userId, otp) => {
    const response = await axios.post(`${API_URL}/user/verify-otp`, { userId, otp });
    return response.data;
  },

  login: async (email, password) => {
    const response = await axios.post(`${API_URL}/user/login`, { email, password });
    return response.data;
  },

  updateProfile: async (data, token) => {
    const response = await axios.post(`${API_URL}/user/update-profile`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getRides: async (token) => {
    const response = await axios.get(`${API_URL}/user/rides`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

export const captainApi = {
  register: async (data) => {
    const response = await axios.post(`${API_URL}/captain/register`, data);
    return response.data;
  },

  verifyOTP: async (captainId, otp) => {
    const response = await axios.post(`${API_URL}/captain/verify-otp`, { captainId, otp });
    return response.data;
  },

  login: async (email, password) => {
    const response = await axios.post(`${API_URL}/captain/login`, { email, password });
    return response.data;
  },

  updateProfile: async (data, token) => {
    const response = await axios.post(`${API_URL}/captain/update-profile`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getTrips: async (token) => {
    const response = await axios.get(`${API_URL}/captain/trips`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

  // Use fetch for Cloudinary uploads (not axios)
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );
  const data = await res.json();
  if (!data.secure_url) throw new Error('Image upload failed');
  return data.secure_url;
};

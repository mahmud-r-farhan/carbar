import { toast } from 'sonner';

export const handleApiError = (error) => {
  console.error('API Error:', error);

  const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
  toast.error(message);

  if (error.response?.status === 401) {
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  throw error;
};

export const handleSocketError = (error) => {
  console.error('WebSocket Error:', error);
  toast.error('Connection error. Please check your internet connection.');
};

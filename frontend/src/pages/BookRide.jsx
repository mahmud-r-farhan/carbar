import React, { useState, useContext } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';

const BookRide = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user] = useContext(UserDataContext);
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/user/book-ride`,
        { from, to },
        {
          headers: { Authorization: `Bearer ${user.token}` },
          withCredentials: true,
        }
      );
      toast.success('Ride booked successfully!');
      setFrom('');
      setTo('');
      navigate('/user/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to book ride';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 min-h-screen bg-gray-50 flex flex-col justify-center"
    >
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Book a Ride</h2>
        {error && (
          <p className="text-red-500 text-center mb-4 bg-red-100 p-2 rounded">{error}</p>
        )}
        <form onSubmit={submitHandler} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Pickup Location</label>
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
              type="text"
              placeholder="Enter pickup location"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Destination</label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
              type="text"
              placeholder="Enter destination"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Booking...' : 'Book Ride'}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

export default BookRide;
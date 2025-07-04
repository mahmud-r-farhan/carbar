import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { UserDataContext } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

const BookRide = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  const [user] = useContext(UserDataContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/user/book-ride', { from, to }, {
        headers: { Authorization: `Bearer ${user.token}` },
        withCredentials: true,
      });
      navigate('/user/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book ride');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-7 h-screen flex flex-col"
    >
      <h1 className="text-2xl font-bold mb-6">Book a Ride</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit}>
        <h3 className="text-xl mb-2">Pickup Location</h3>
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          required
          className="bg-[#eeeeee] mb-6 rounded px-4 border w-full text-base h-11 placeholder:text-sm"
          type="text"
          placeholder="Enter pickup location"
        />
        <h3 className="text-xl mb-2">Destination</h3>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
          className="bg-[#eeeeee] mb-6 rounded px-4 border w-full text-base h-11 placeholder:text-sm"
          type="text"
          placeholder="Enter destination"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-blue-500 text-white px-4 py-2 rounded w-full"
          type="submit"
        >
          Book Ride
        </motion.button>
      </form>
    </motion.div>
  );
};

export default BookRide;
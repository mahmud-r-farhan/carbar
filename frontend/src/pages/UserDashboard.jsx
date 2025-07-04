import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';
import axios from 'axios';

const UserDashboard = () => {
  const [user, setUser] = useContext(UserDataContext);
  const navigate = useNavigate();

  const dummyRides = [
    { id: 1, from: 'Downtown', to: 'Airport', date: '2025-07-05', status: 'Completed', cost: 25 },
    { id: 2, from: 'Park Street', to: 'Mall', date: '2025-07-04', status: 'Pending', cost: 15 },
  ];

  const handleLogout = async () => {
    try {
      await axios.get('http://localhost:3000/user/logout', { withCredentials: true });
      setUser({ email: '', fullname: { firstName: '', lastName: '' }, role: '', token: '' });
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-7 h-screen flex flex-col"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Welcome, {user.fullname.firstName}</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Logout
        </motion.button>
      </div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Rides</h2>
        {dummyRides.map((ride) => (
          <motion.div
            key={ride.id}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-gray-100 p-4 rounded mb-3"
          >
            <p><strong>From:</strong> {ride.from}</p>
            <p><strong>To:</strong> {ride.to}</p>
            <p><strong>Date:</strong> {ride.date}</p>
            <p><strong>Status:</strong> {ride.status}</p>
            <p><strong>Cost:</strong> ${ride.cost}</p>
          </motion.div>
        ))}
      </div>
      <div className="flex gap-4">
        <Link to="/user/book-ride" className="bg-blue-500 text-white px-4 py-2 rounded">
          Book a Ride
        </Link>
        <Link to="/user/map" className="bg-blue-500 text-white px-4 py-2 rounded">
          View Map
        </Link>
        <Link to="/user/chat" className="bg-green-500 text-white px-4 py-2 rounded">
          Chat with Support
        </Link>
      </div>
    </motion.div>
  );
};

export default UserDashboard;
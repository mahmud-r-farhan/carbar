import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';
import axios from 'axios';

const CaptainDashboard = () => {
  const [user, setUser] = useContext(UserDataContext);
  const navigate = useNavigate();

  const dummyTrips = [
    { id: 1, passenger: 'John Doe', from: 'Downtown', to: 'Airport', date: '2025-07-05', status: 'Accepted', earnings: 30 },
    { id: 2, passenger: 'Jane Smith', from: 'Park Street', to: 'Mall', date: '2025-07-04', status: 'Pending', earnings: 20 },
  ];

  const handleLogout = async () => {
    try {
      await axios.get('http://localhost:3000/captain/logout', { withCredentials: true });
      setUser({ email: '', fullname: { firstName: '', lastName: '' }, role: '', token: '' });
      navigate('/captain-login');
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
        <h1 className="text-2xl font-bold">Welcome, Captain {user.fullname.firstName}</h1>
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
        <h2 className="text-xl font-semibold mb-4">Your Trips</h2>
        {dummyTrips.map((trip) => (
          <motion.div
            key={trip.id}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-gray-100 p-4 rounded mb-3"
          >
            <p><strong>Passenger:</strong> {trip.passenger}</p>
            <p><strong>From:</strong> {trip.from}</p>
            <p><strong>To:</strong> {trip.to}</p>
            <p><strong>Date:</strong> {trip.date}</p>
            <p><strong>Status:</strong> {trip.status}</p>
            <p><strong>Earnings:</strong> ${trip.earnings}</p>
          </motion.div>
        ))}
      </div>
      <div className="flex gap-4">
        <Link to="/captain/map" className="bg-blue-500 text-white px-4 py-2 rounded">
          View Map
        </Link>
        <Link to="/captain/chat" className="bg-green-500 text-white px-4 py-2 rounded">
          Chat with Support
        </Link>
      </div>
    </motion.div>
  );
};

export default CaptainDashboard;
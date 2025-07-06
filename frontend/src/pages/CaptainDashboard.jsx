import React, { useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';
import axios from 'axios';
import useWebSocket from '../hooks/useWebSocket';

const CaptainDashboard = () => {
  const [user, setUser] = useContext(UserDataContext);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('inactive');
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const { socket } = useWebSocket();

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/captain/trips`, {
          headers: { Authorization: `Bearer ${user.token}` },
          withCredentials: true,
        });
        setTrips(response.data);
      } catch (err) {
        toast.error('Failed to fetch trips');
      } finally {
        setLoading(false);
      }
    };
    if (user.token) fetchTrips();
  }, [user.token]);

  useEffect(() => {
    if (socket) {
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'new_trip_request') {
          setNotifications((prev) => [
            ...prev,
            { type: 'new_trip_request', message: 'New ride request received!', trip: data.data }
          ]);
          toast.info('New ride request received!');
        }
      };
    }
  }, [socket]);

  const handleLogout = async () => {
    try {
      await axios.get(`${import.meta.env.VITE_API_URL}/captain/logout`, {
        withCredentials: true,
      });
      setUser({ email: '', fullname: { firstName: '', lastName: '' }, role: '', token: '', verified: false, profileImage: '' });
      localStorage.removeItem('user');
      navigate('/captain-login');
      toast.success('Logged out successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Logout failed');
    }
  };

  const toggleStatus = () => {
    const newStatus = status === 'active' ? 'inactive' : 'active';
    setStatus(newStatus);
    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify({ type: 'status_update', data: { status: newStatus } }));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-8 min-h-screen bg-[#f7f7f7] font-sans text-gray-800"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-5">
            <img
              src={user.profileImage || '/assets/images/avatar-placeholder.png'}
              alt="Profile"
              className="w-14 h-14 rounded-full object-cover border-4 border-blue-700"
            />
            <h1 className="text-3xl font-semibold">
              Welcome, Captain {user.fullname.firstName}
            </h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="bg-[#111] text-white px-6 py-3 rounded-lg hover:bg-gray-900 transition"
          >
            Logout
          </motion.button>
        </div>

        {/* Status and Notifications */}
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleStatus}
            className={`px-4 py-2 rounded ${status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}`}
          >
            {status === 'active' ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
        {notifications.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded">
            <ul>
              {notifications.map((n, idx) => (
                <li key={idx} className="text-blue-800">{n.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Trip Summary */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-xl shadow-lg p-8 mb-10"
        >
          <h2 className="text-2xl font-semibold mb-6 border-b border-gray-200 pb-3">Trip Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="bg-[#eeeeee] rounded-lg p-6 text-center">
              <p className="text-lg font-medium mb-2 text-blue-800">Total Trips</p>
              <p className="text-4xl font-bold">{trips.length}</p>
            </div>
            <div className="bg-[#eeeeee] rounded-lg p-6 text-center">
              <p className="text-lg font-medium mb-2 text-green-800">Total Earnings</p>
              <p className="text-4xl font-bold">
                ${trips.reduce((sum, trip) => sum + (trip.earnings || 0), 0)}
              </p>
            </div>
            <div className="bg-[#eeeeee] rounded-lg p-6 text-center">
              <p className="text-lg font-medium mb-2 text-yellow-800">Pending Trips</p>
              <p className="text-4xl font-bold">
                {trips.filter((trip) => trip.status === 'Pending').length}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Trips Table */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-8"
        >
          <h2 className="text-2xl font-semibold mb-6 border-b border-gray-200 pb-3">Your Trips</h2>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-700"></div>
            </div>
          ) : trips.length === 0 ? (
            <p className="text-gray-600 text-center py-16">No trips available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-700 border-b border-gray-300">
                    <th className="py-4 px-6">Passenger</th>
                    <th className="py-4 px-6">From</th>
                    <th className="py-4 px-6">To</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip) => (
                    <motion.tr
                      key={trip.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-gray-200 hover:bg-[#f0f0f0]"
                    >
                      <td className="py-4 px-6">{trip.passenger}</td>
                      <td className="py-4 px-6">{trip.from}</td>
                      <td className="py-4 px-6">{trip.to}</td>
                      <td className="py-4 px-6">{new Date(trip.date).toLocaleDateString()}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                            trip.status === 'Accepted'
                              ? 'bg-green-200 text-green-800'
                              : 'bg-yellow-200 text-yellow-800'
                          }`}
                        >
                          {trip.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">${trip.earnings}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Navigation Buttons */}
        <div className="flex gap-6 mt-10 justify-center">
          <Link
            to="/captain/map"
            className="bg-[#111] text-white px-8 py-3 rounded-lg hover:bg-gray-900 transition text-lg font-medium"
          >
            View Map
          </Link>
          <Link
            to="/captain/chat"
            className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition text-lg font-medium"
          >
            Chat with Support
          </Link>
          <Link
            to="/captain/settings"
            className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition text-lg font-medium"
          >
            Settings
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default CaptainDashboard;
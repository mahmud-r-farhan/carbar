import React, { useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';
import axios from 'axios';
import useWebSocket from '../hooks/useWebSocket';

const CaptainDashboard = () => {
  const { user, setUser } = useContext(UserDataContext);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={
                    user.profileImage ||
                    'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541'
                  }
                  alt="Profile"
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-200 shadow-sm"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-800">
                  Welcome, Captain {user.fullname.firstName}!
                </h1>
                <p className="text-sm text-gray-600">Ready to take the wheel?</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={toggleStatus}
                className={`px-6 py-2.5 rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 ${
                  status === 'active'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                    : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                }`}
              >
                {status === 'active' ? 'Go Offline' : 'Go Online'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2.5 rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Logout
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Notifications */}
        {notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-400 to-cyan-400 text-white p-6 rounded-3xl mb-8 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <h3 className="font-semibold">Latest Updates</h3>
            </div>
            <ul className="space-y-1">
              {notifications.map((n, idx) => (
                <li key={idx} className="text-white/90">{n.message}</li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl border border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Trips</p>
                <p className="text-3xl font-bold text-gray-800">{trips.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl border border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Earnings</p>
                <p className="text-3xl font-bold text-gray-800">
                  ${trips.reduce((sum, trip) => sum + (trip.earnings || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl border border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Pending Trips</p>
                <p className="text-3xl font-bold text-gray-800">
                  {trips.filter((trip) => trip.status === 'Pending').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Trips Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/70 backdrop-blur-sm rounded-3xl border border-blue-100 shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-blue-100">
            <h2 className="text-xl font-semibold text-gray-800">Your Trips</h2>
            <p className="text-gray-600 text-sm mt-1">Track all your ride history</p>
          </div>

            {loading ? (
            <div className="flex justify-center py-16">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-gray-600">No trips yet. Start your first ride!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-50/50">
                  <tr className="text-left">
                    <th className="py-4 px-6 text-gray-700 font-medium">Passenger</th>
                    <th className="py-4 px-6 text-gray-700 font-medium">From</th>
                    <th className="py-4 px-6 text-gray-700 font-medium">To</th>
                    <th className="py-4 px-6 text-gray-700 font-medium hidden sm:table-cell">Date</th>
                    <th className="py-4 px-6 text-gray-700 font-medium">Status</th>
                    <th className="py-4 px-6 text-gray-700 font-medium hidden md:table-cell">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip, index) => (
                    <motion.tr
                      key={trip.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-b border-blue-100 hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="py-4 px-6 text-gray-800">{trip.passenger}</td>
                      <td className="py-4 px-6 text-gray-800">{trip.from}</td>
                      <td className="py-4 px-6 text-gray-800">{trip.to}</td>
                      <td className="py-4 px-6 text-gray-600 hidden sm:table-cell">
                        {new Date(trip.date).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            trip.status === 'Accepted'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {trip.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-800 font-medium hidden md:table-cell">
                        ${trip.earnings.toFixed(2)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-8"
        >
          <Link
            to="/captain/map"
            className="group bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="font-medium">View Map</span>
            </div>
          </Link>

          <Link
            to="/captain/chat"
            className="group bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="font-medium">Chat with Support</span>
            </div>
          </Link>

          <Link
            to="/captain/settings"
            className="group bg-gradient-to-r from-gray-500 to-gray-600 text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="font-medium">Settings</span>
            </div>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default CaptainDashboard;
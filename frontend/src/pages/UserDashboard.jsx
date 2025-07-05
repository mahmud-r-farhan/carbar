import React, { useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';
import axios from 'axios';

const UserDashboard = () => {
  const [user, setUser] = useContext(UserDataContext);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/user/rides`, {
          headers: { Authorization: `Bearer ${user.token}` },
          withCredentials: true,
        });
        setRides(response.data);
      } catch (err) {
        toast.error('Failed to fetch rides');
      } finally {
        setLoading(false);
      }
    };
    if (user.token) fetchRides();
  }, [user.token]);

  const handleLogout = async () => {
    try {
      await axios.get(`${import.meta.env.VITE_API_URL}/user/logout`, {
        withCredentials: true,
      });
      setUser({ email: '', fullname: { firstName: '', lastName: '' }, role: '', token: '', verified: false, profileImage: '' });
      localStorage.removeItem('user');
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Logout failed');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-8 min-h-screen bg-[#f7f7f7] font-sans text-gray-900"
    >
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-5">
            <img
              src={
                user.profileImage ||
                'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541'
              }
              alt="Profile"
              className="w-12 h-12 rounded-full object-cover border-4 border-blue-500 shadow"
            />
            <h1 className="text-3xl font-bold">
              Welcome, {user.fullname.firstName}
            </h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="bg-red-600 text-white px-5 py-2 rounded-xl hover:bg-red-700 font-semibold shadow"
          >
            Logout
          </motion.button>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10"
        >
          <div className="bg-blue-100 p-6 rounded-xl shadow text-center">
            <p className="text-lg font-semibold text-blue-900 mb-2">Total Rides</p>
            <p className="text-4xl font-extrabold">{rides.length}</p>
          </div>
          <div className="bg-green-100 p-6 rounded-xl shadow text-center">
            <p className="text-lg font-semibold text-green-900 mb-2">Total Spent</p>
            <p className="text-4xl font-extrabold">
              ${rides.reduce((sum, ride) => sum + (ride.cost || 0), 0)}
            </p>
          </div>
          <div className="bg-yellow-100 p-6 rounded-xl shadow text-center">
            <p className="text-lg font-semibold text-yellow-900 mb-2">Pending Rides</p>
            <p className="text-4xl font-extrabold">
              {rides.filter((ride) => ride.status === 'Pending').length}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow p-6 overflow-x-auto"
        >
          <h2 className="text-2xl font-semibold mb-6">Your Rides</h2>
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-600"></div>
            </div>
          ) : rides.length === 0 ? (
            <p className="text-gray-600 text-center py-10">No rides available.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-gray-700 border-b border-gray-300">
                  <th className="py-4 px-3">From</th>
                  <th className="py-4 px-3">To</th>
                  <th className="py-4 px-3">Date</th>
                  <th className="py-4 px-3">Status</th>
                  <th className="py-4 px-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {rides.map((ride) => (
                  <motion.tr
                    key={ride.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-3">{ride.from}</td>
                    <td className="py-4 px-3">{ride.to}</td>
                    <td className="py-4 px-3">{new Date(ride.date).toLocaleDateString()}</td>
                    <td className="py-4 px-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          ride.status === 'Completed'
                            ? 'bg-green-200 text-green-900'
                            : 'bg-yellow-200 text-yellow-900'
                        }`}
                      >
                        {ride.status}
                      </span>
                    </td>
                    <td className="py-4 px-3">${ride.cost}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>

        <div className="flex flex-wrap gap-5 justify-center mt-12">
          <Link
            to="/user/book-ride"
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 font-semibold shadow"
          >
            Book a Ride
          </Link>
          <Link
            to="/user/map"
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 font-semibold shadow"
          >
            View Map
          </Link>
          <Link
            to="/user/chat"
            className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 font-semibold shadow"
          >
            Chat with Support
          </Link>
          <Link
            to="/settings"
            className="bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600 font-semibold shadow"
          >
            Settings
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default UserDashboard;
import { motion } from 'framer-motion';
import { useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
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
      } catch {
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 min-h-screen bg-gray-50 text-gray-800"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-4">
            <img
              src={
                user.profileImage ||
                'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541'
              }
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border"
            />
            <h1 className="text-lg font-medium">Hi, {user.fullname.firstName}</h1>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white text-sm px-4 py-1.5 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border rounded p-4 text-center">
            <p className="text-sm text-gray-500">Total Rides</p>
            <p className="text-xl font-bold">{rides.length}</p>
          </div>
          <div className="bg-white border rounded p-4 text-center">
            <p className="text-sm text-gray-500">Total Spent</p>
            <p className="text-xl font-bold">${rides.reduce((sum, ride) => sum + (ride.cost || 0), 0).toFixed(2)}</p>
          </div>
          <div className="bg-white border rounded p-4 text-center">
            <p className="text-sm text-gray-500">Pending Rides</p>
            <p className="text-xl font-bold">
              {rides.filter((ride) => ride.status === 'Pending').length}
            </p>
          </div>
        </div>

        {/* Ride Table */}
        <div className="bg-white border rounded p-4">
          <h2 className="text-lg font-semibold mb-4">Your Rides</h2>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rides.length === 0 ? (
            <p className="text-center text-gray-500 py-6">No rides available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b text-gray-600">
                    <th className="py-2 px-3">From</th>
                    <th className="py-2 px-3">To</th>
                    <th className="py-2 px-3 hidden sm:table-cell">Date</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 hidden md:table-cell">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {rides.map((ride) => (
                    <tr key={ride.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3">{ride.from}</td>
                      <td className="py-2 px-3">{ride.to}</td>
                      <td className="py-2 px-3 hidden sm:table-cell">{new Date(ride.date).toLocaleDateString()}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            ride.status === 'Completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {ride.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 hidden md:table-cell">${ride.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/user/book-ride" className="bg-blue-600 text-white px-4 py-2 text-sm rounded hover:bg-blue-700">
            Book a Ride
          </Link>
          <Link to="/user/map" className="bg-blue-600 text-white px-4 py-2 text-sm rounded hover:bg-blue-700">
            View Map
          </Link>
          <Link to="/user/chat" className="bg-green-600 text-white px-4 py-2 text-sm rounded hover:bg-green-700">
            Chat with Support
          </Link>
          <Link to="/settings" className="bg-gray-500 text-white px-4 py-2 text-sm rounded hover:bg-gray-600">
            Settings
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default UserDashboard;
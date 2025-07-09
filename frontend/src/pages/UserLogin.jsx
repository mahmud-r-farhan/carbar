import React, { useState, useContext } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';

const UserLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [, , login] = useContext(UserDataContext);
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userData = await login(email.trim(), password.trim(), 'user');
      setEmail('');
      setPassword('');
      setTimeout(() => {
        navigate('/user/dashboard', { replace: true });
      }, 100);
    } catch (err) {
      const message = err?.response?.data?.message || 'Login failed';
      console.error('UserLogin - Error:', err.response?.data);
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
      className="p-7 h-screen flex flex-col justify-between bg-white text-gray-800"
    >
      <div>
        <img
          className="w-20 mb-10"
          src="/assets/images/carbar.png"
          alt="CarBar Logo"
        />
        {error && <p className="text-red-500 mb-4 bg-red-100 p-2 rounded">{error}</p>}
        <form onSubmit={submitHandler}>
          <h3 className="text-xl mb-2">What's your email</h3>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-[#eeeeee] mb-7 rounded px-4 border w-full text-lg h-11 placeholder:text-base"
            type="email"
            placeholder="Type your email address"
          />
          <h3 className="text-xl mb-2">Enter Password</h3>
          <div className="relative mb-6">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-[#eeeeee] rounded px-4 pr-11 border w-full text-base h-11 placeholder:text-sm"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.95 }}
            className="bg-[#111] text-white mb-7 rounded px-4 border w-full h-11 text-lg disabled:bg-gray-400"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </motion.button>
        </form>
        <p>
          New?{' '}
          <Link to="/signup" className="text-orange-500 hover:text-blue-600">
            Create a new Account
          </Link>
        </p>
      </div>
      <div>
        <Link to="/captain-login" className="text-orange-600 hover:text-green-700">
          Sign in as Captain
        </Link>
      </div>
    </motion.div>
  );
};

export default UserLogin;
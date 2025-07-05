import React, { useState, useContext } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';
import { Eye, EyeOff } from 'lucide-react'; // Add icon library

const CaptainLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Toggle state
  const [error, setError] = useState('');
  const [, setUser] = useContext(UserDataContext);
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/captain/login`, {
        email,
        password,
      }, { withCredentials: true });
      setUser({
        email: response.data.captain.email,
        fullname: {
          firstName: response.data.captain.fullname.firstname,
          lastName: response.data.captain.fullname.lastname,
        },
        role: 'captain',
        token: response.data.token,
      });
      setEmail('');
      setPassword('');
      navigate('/captain/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      toast.error(message);
      setError(message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-7 h-screen flex flex-col justify-between"
    >
      <div>
        <img
          className="w-36 mb-3"
          src="/assets/images/carbar-logo.png"
          alt="CarBar Logo"
        />
        {error && <p className="text-red-500 mb-4">{error}</p>}
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
          <div className="relative mb-7">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-[#eeeeee] rounded px-4 pr-11 border w-full text-lg h-11 placeholder:text-base"
              type={showPassword ? 'text' : 'password'}
              placeholder="Type your Password"
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
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-[#111] text-[#fff] mb-7 rounded px-4 border w-full h-11 text-lg"
            type="submit"
          >
            Login
          </motion.button>
        </form>
        <p>
          New?{' '}
          <Link to="/captain-signup" className="text-green-500 hover:text-green-600">
            Join Now
          </Link>
        </p>
      </div>
      <div>
        <Link to="/login" className="text-blue-600 hover:text-blue-700">
          Sign in as User
        </Link>
      </div>
    </motion.div>
  );
};

export default CaptainLogin;
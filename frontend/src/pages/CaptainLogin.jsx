import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';

const CaptainLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [, setUser] = useContext(UserDataContext);
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3000/captain/login', {
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
      setError(err.response?.data?.message || 'Login failed');
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
          src="https://static.vecteezy.com/system/resources/previews/027/127/451/non_2x/uber-logo-uber-icon-transparent-free-png.png"
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
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-[#eeeeee] mb-7 rounded px-4 border w-full text-lg h-11 placeholder:text-base"
            type="password"
            placeholder="Type your Password"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            while Extent={{ scale: 0.95 }}
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
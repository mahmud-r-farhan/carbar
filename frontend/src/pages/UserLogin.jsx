import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';

const UserLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [, setUser] = useContext(UserDataContext);
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3000/user/login', {
        email,
        password,
      }, { withCredentials: true });
      setUser({
        email: response.data.user.email,
        fullname: {
          firstName: response.data.user.fullname.firstname,
          lastName: response.data.user.fullname.lastname,
        },
        role: 'user',
        token: response.data.token,
      });
      setEmail('');
      setPassword('');
      navigate('/user/dashboard');
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
          className="w-20 mb-10"
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Uber_logo_2018.svg/1024px-Uber_logo_2018.svg.png"
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
            whileTap={{ scale: 0.95 }}
            className="bg-[#111] text-[#fff] mb-7 rounded px-4 border w-full h-11 text-lg"
            type="submit"
          >
            Login
          </motion.button>
        </form>
        <p>
          New?{' '}
          <Link to="/signup" className="text-blue-500 hover:text-blue-600">
            Create a new Account
          </Link>
        </p>
      </div>
      <div>
        <Link to="/captain-login" className="text-green-600 hover:text-green-700">
          Sign in as Captain
        </Link>
      </div>
    </motion.div>
  );
};

export default UserLogin;
import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import TermModal from '../components/TermModal';
import { UserDataContext } from '../context/UserContext';

const UserSignUp = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [, setUser] = useContext(UserDataContext);
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3000/user/register', {
        fullname: { firstname: firstName, lastname: lastName },
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
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      navigate('/user/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
          <h3 className="text-xl mb-2">What's your name</h3>
          <div className="flex gap-3 mb-5">
            <input
              required
              className="bg-[#eeeeee] w-1/2 rounded px-4 border text-base h-11 placeholder:text-sm"
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              required
              className="bg-[#eeeeee] w-1/2 rounded px-4 border text-base h-11 placeholder:text-sm"
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <h3 className="text-xl mb-2">What's your email</h3>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-[#eeeeee] mb-6 rounded px-4 border w-full text-base h-11 placeholder:text-sm"
            type="email"
            placeholder="Email address"
          />
          <h3 className="text-xl mb-2">Enter Password</h3>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-[#eeeeee] mb-6 rounded px-4 border w-full text-base h-11 placeholder:text-sm"
            type="password"
            placeholder="Set Password"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-[#111] text-[#fff] mb-7 rounded px-4 border w-full h-11 text-lg"
            type="submit"
          >
            Sign Up
          </motion.button>
        </form>
        <p>
          Already have an account?{' '}
          <Link to="/login" className="text-blue-500 hover:text-blue-600">
            Login
          </Link>
        </p>
      </div>
      <TermModal role="user" />
    </motion.div>
  );
};

export default UserSignUp;
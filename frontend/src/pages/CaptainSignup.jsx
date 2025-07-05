import React, { useState, useContext } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import TermModal from '../components/TermModal';
import { Eye, EyeOff } from 'lucide-react';
import { UserDataContext } from '../context/UserContext';

const CaptainSignup = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [error, setError] = useState('');
  const [, setUser] = useContext(UserDataContext);
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post( `${import.meta.env.VITE_API_URL}/captain/register`, {
        fullname: { firstname: firstName, lastname: lastName },
        email,
        password,
        vehicle: {
          color: vehicleColor,
          plate: vehiclePlate,
          capacity: parseInt(vehicleCapacity),
          vehicleType,
        },
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
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setVehicleColor('');
      setVehiclePlate('');
      setVehicleCapacity('');
      setVehicleType('');
      navigate('/captain/dashboard');
    } catch (err) {
       const message = err.response?.data?.message || 'Registration failed';
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
          src="https://static.vecteezy.com/system/resources/previews/027/127/451/non_2x/uber-logo-uber-icon-transparent-free-png.png"
          alt="CarBar Logo"
        />
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={submitHandler}>
          <h1 className="text-3xl font-semibold justify-center text-center pb-6">
            Create Captain account
          </h1>
          <h3 className="text-xl mb-2">What's your Name</h3>
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
          <div className="relative mb-6">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-[#eeeeee] rounded px-4 pr-11 border w-full text-base h-11 placeholder:text-sm"
            type={showPassword ? 'text' : 'password'}
            placeholder="Set Password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
          <h3 className="text-xl mb-2">Vehicle Details</h3>
          <input
            value={vehicleColor}
            onChange={(e) => setVehicleColor(e.target.value)}
            required
            className="bg-[#eeeeee] mb-6 rounded px-4 border w-full text-base h-11 placeholder:text-sm"
            type="text"
            placeholder="Vehicle Color"
          />
          <input
            value={vehiclePlate}
            onChange={(e) => setVehiclePlate(e.target.value)}
            required
            className="bg-[#eeeeee] mb-6 rounded px-4 border w-full text-base h-11 placeholder:text-sm"
            type="text"
            placeholder="Vehicle Plate"
          />
          <input
            value={vehicleCapacity}
            onChange={(e) => setVehicleCapacity(e.target.value)}
            required
            className="bg-[#eeeeee] mb-6 rounded px-4 border w-full text-base h-11 placeholder:text-sm"
            type="number"
            placeholder="Vehicle Capacity"
          />
          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            required
            className="bg-[#eeeeee] mb-6 rounded px-4 border w-full text-base h-11"
          >
            <option value="" disabled>Select Vehicle Type</option>
            <option value="car">Car</option>
            <option value="motorcycle">Motorcycle</option>
            <option value="auto">Auto</option>
            <option value="cng">CNG</option>
            <option value="bycycle">Bicycle</option>
          </select>
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
          <Link to="/captain-login" className="text-green-500 hover:text-green-600">
            Login
          </Link>
        </p>
      </div>
      <TermModal role="captain" />
    </motion.div>
  );
};

export default CaptainSignup;
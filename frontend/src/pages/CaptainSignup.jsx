import React, { useState, useContext, useEffect } from 'react';
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
  const [step, setStep] = useState(1);
  const [captainId, setCaptainId] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpTimer, setOtpTimer] = useState(300);
  const [loading, setLoading] = useState(false);
  const [, setUser] = useContext(UserDataContext);
  const navigate = useNavigate();

  // Timer effect for OTP expiration
  useEffect(() => {
    if (step === 2 && otpTimer > 0) {
      const timer = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, otpTimer]);

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/captain/register`,
        {
          fullname: { firstname: firstName, lastname: lastName },
          email,
          password,
          vehicle: {
            color: vehicleColor,
            plate: vehiclePlate,
            capacity: parseInt(vehicleCapacity),
            vehicleType,
          },
        },
        { withCredentials: true }
      );

      setCaptainId(String(response.data.captainId));
      setStep(2);
      setOtpTimer(300);
      toast.success('OTP sent to your email!');
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setOtpError('');
    const sanitizedOtp = otp.trim();
    if (sanitizedOtp.length !== 6) {
      setOtpError('OTP must be 6 digits');
      setLoading(false);
      toast.error('OTP must be 6 digits');
      return;
    }
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/captain/verify-otp`,
        {
          captainId,
          otp: sanitizedOtp,
        },
        { withCredentials: true }
      );

      const userData = {
        email: response.data.captain.email,
        fullname: {
          firstName: response.data.captain.fullname.firstname,
          lastName: response.data.captain.fullname.lastname,
        },
        role: 'captain',
        token: response.data.token,
        verified: true,
        profileImage: response.data.captain.profileImage || '',
      };

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setStep(1);
      setOtp('');
      toast.success('Account verified successfully!');
      navigate('/captain/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'OTP verification failed';
      setOtpError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    setOtpError('');
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/captain/resend-otp`,
        { captainId },
        { withCredentials: true }
      );
      setOtpTimer(300);
      setOtp('');
      setOtpError('');
      toast.success('New OTP sent to your email!');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to resend OTP';
      setOtpError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-7 h-screen flex flex-col justify-between"
    >
      <div>
        <img className="w-36 mb-3" src="/assets/images/carbar.png" alt="CarBar Logo" />
        {step === 1 ? (
          <form onSubmit={submitHandler}>
            <h1 className="text-3xl font-semibold text-center pb-6">Create Captain account</h1>
            {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
            <h3 className="text-xl mb-2">What's your Name</h3>
            <div className="flex gap-3 mb-5">
              <input
                required
                className="bg-[#eee] w-1/2 rounded px-4 border h-11 placeholder:text-sm"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                required
                className="bg-[#eee] w-1/2 rounded px-4 border h-11 placeholder:text-sm"
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
              className="bg-[#eee] mb-6 rounded px-4 border w-full h-11 placeholder:text-sm"
              type="email"
              placeholder="Email address"
            />
            <h3 className="text-xl mb-2">Enter Password</h3>
            <div className="relative mb-6">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[#eee] rounded px-4 pr-11 border w-full h-11 placeholder:text-sm"
                type={showPassword ? 'text' : 'password'}
                placeholder="Set Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <h3 className="text-xl mb-2">Vehicle Details</h3>
            <input
              value={vehicleColor}
              onChange={(e) => setVehicleColor(e.target.value)}
              required
              className="bg-[#eee] mb-6 rounded px-4 border w-full h-11 placeholder:text-sm"
              type="text"
              placeholder="Vehicle Color"
            />
            <input
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              required
              className="bg-[#eee] mb-6 rounded px-4 border w-full h-11 placeholder:text-sm"
              type="text"
              placeholder="Vehicle Plate"
            />
            <input
              value={vehicleCapacity}
              onChange={(e) => setVehicleCapacity(e.target.value)}
              required
              className="bg-[#eee] mb-6 rounded px-4 border w-full h-11 placeholder:text-sm"
              type="number"
              placeholder="Vehicle Capacity"
            />
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              required
              className="bg-[#eee] mb-6 rounded px-4 border w-full h-11"
            >
              <option value="" disabled>Select Vehicle Type</option>
              <option value="car">Car</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="auto">Auto</option>
              <option value="cng">CNG</option>
              <option value="bicycle">Bicycle</option>
            </select>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-[#111] text-white mb-7 rounded px-4 border w-full h-11 text-lg"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Sign Up'}
            </motion.button>
            <p>
              Already have an account?{' '}
              <Link to="/captain-login" className="text-green-500 hover:text-green-600">
                Login
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={verifyOtpHandler}>
            <h1 className="text-3xl font-semibold text-center pb-6">Verify OTP</h1>
            <p className="text-center mb-4">
              An OTP has been sent to <strong>{email}</strong>
            </p>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
              className="bg-[#eee] mb-4 rounded px-4 border w-full h-11 placeholder:text-sm"
              type="text"
              placeholder="Enter 6-digit OTP"
            />
            <p className="text-sm mb-3 text-center">
              {otpTimer > 0
                ? `OTP expires in ${Math.floor(otpTimer / 60)}:${String(
                    otpTimer % 60
                  ).padStart(2, '0')}`
                : 'OTP expired'}
            </p>
            {otpError && <p className="text-red-500 mb-4 text-center">{otpError}</p>}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-[#111] text-white mb-5 rounded px-4 border w-full h-11 text-lg"
              type="submit"
              disabled={loading || otpTimer === 0}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </motion.button>
            {otpTimer === 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resendOtp}
                className="text-blue-500 w-full hover:underline"
                disabled={loading}
              >
                {loading ? 'Resending...' : 'Resend OTP'}
              </motion.button>
            )}
          </form>
        )}
      </div>
      <TermModal role="captain" />
    </motion.div>
  );
};

export default CaptainSignup;
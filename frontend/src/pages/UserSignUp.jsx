import React, { useState, useContext, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import TermModal from '../components/TermModal';
import { UserDataContext } from '../context/UserContext';
import axios from 'axios';

const UserSignUp = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpTimer, setOtpTimer] = useState(300);
  const [loading, setLoading] = useState(false);
  const [, setUser] = useContext(UserDataContext);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/register`, {
        fullname: { firstname: firstName, lastname: lastName },
        email: email.trim(),
        password: password.trim(),
      }, { withCredentials: true });

      setUserId(response.data.userId);
      setStep(2);
      setOtpTimer(300);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

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

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/verify-otp`, {
        userId,
        otp: otp.trim(),
      }, { withCredentials: true });

      const userData = {
        email: response.data.user.email,
        fullname: {
          firstName: response.data.user.fullname.firstname,
          lastName: response.data.user.fullname.lastname,
        },
        role: 'user',
        token: response.data.token,
        verified: true,
        profileImage: response.data.user.profileImage || '',
      };

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setOtp('');
      setStep(1);

      toast.success('Account verified successfully!');
      navigate('/user/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'OTP verification failed';
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
      className="p-7 h-screen flex flex-col justify-between bg-white"
    >
      <div>
        <img
          className="w-20 mb-10"
          src="/assets/images/carbar.png"
          alt="CarBar Logo"
        />
        {step === 1 ? (
          <>
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
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-[#111] text-[#fff] mb-7 rounded px-4 border w-full h-11 text-lg"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Sign Up'}
              </motion.button>
            </form>
            <p>
              Already have an account?{' '}
              <Link to="/login" className="text-orange-500 hover:text-blue-600">
                Login
              </Link>
            </p>
          </>
        ) : (
          <form onSubmit={verifyOtpHandler}>
            <h3 className="text-xl mb-2">Enter OTP</h3>
            <p className="text-gray-600 mb-2">OTP sent to {email}</p>
            <input
              value={otp}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d{0,6}$/.test(val)) setOtp(val);
              }}
              required
              className="bg-[#eeeeee] mb-4 rounded px-4 border w-full text-base h-11 placeholder:text-sm"
              type="text"
              placeholder="Enter OTP"
              maxLength={6}
            />
            <div className="text-gray-600 text-sm mb-4">
              {otpTimer > 0
                ? `OTP expires in ${Math.floor(otpTimer / 60)}:${String(otpTimer % 60).padStart(2, '0')}`
                : 'OTP expired. Please try again.'}
            </div>
            {otpError && <p className="text-red-500 mb-4">{otpError}</p>}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-[#111] text-white mb-4 rounded px-4 border w-full h-11 text-lg"
              type="submit"
              disabled={loading || otpTimer === 0}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </motion.button>
            {otpTimer === 0 && (
              <button
                onClick={() => {
                  setStep(1);
                  setOtp('');
                  setOtpError('');
                }}
                className="text-blue-500 hover:underline w-full"
                type="button"
              >
                Resend OTP
              </button>
            )}
          </form>
        )}
      </div>
      <TermModal role="user" />
    </motion.div>
  );
};

export default UserSignUp;
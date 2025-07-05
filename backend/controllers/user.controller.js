const userModel = require('../models/user.model');
const userService = require('../services/user.services');
const { validationResult } = require('express-validator');
const blackListTokenModel = require('../models/blacklistToken.model');
const { sendOTPEmail } = require('../services/email.service');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports.registerUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password } = req.body;

    const isUserAlreadyExist = await userModel.findOne({ email });
    if (isUserAlreadyExist) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await userModel.hashPassword(password);
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const user = await userService.createUser({
      firstname: fullname.firstname,
      lastname: fullname.lastname,
      email,
      password: hashedPassword,
      verificationCode: { code: otp, expiresAt },
    });

    await sendOTPEmail(email, otp);
    res.status(201).json({ message: 'OTP sent to email', userId: user._id.toString() });
  } catch (error) {
    next(error);
  }
};

module.exports.verifyUserOTP = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;
    const sanitizedOtp = otp.trim(); // Remove any whitespace
    console.log('Verifying OTP for userId:', userId, 'OTP:', sanitizedOtp);

    const user = await userModel.findById(userId);
    if (!user || !user.verificationCode) {
      console.log('Invalid userId or no verification code:', userId);
      return res.status(400).json({ message: 'Invalid request' });
    }

    console.log('Stored OTP:', user.verificationCode.code, 'Expires At:', user.verificationCode.expiresAt);

    if (
      user.verificationCode.code !== sanitizedOtp ||
      user.verificationCode.expiresAt < new Date()
    ) {
      console.log('OTP mismatch or expired:', {
        stored: user.verificationCode.code,
        provided: sanitizedOtp,
        expired: user.verificationCode.expiresAt < new Date(),
      });
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.verified = true;
    user.verificationCode = undefined;
    await user.save();
    const token = user.generateAuthToken();
    res.status(200).json({ message: 'Account verified', token, user });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    next(error);
  }
};

module.exports.loginUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await userModel.findOne({ email }).select('+password');

    if (!user || !user.verified) {
      return res.status(401).json({ message: 'Invalid email or unverified account' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = user.generateAuthToken();
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000,
    });

    res.status(200).json({ token, user });
  } catch (error) {
    next(error);
  }
};

module.exports.getUserProfile = async (req, res, next) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    next(error);
  }
};

module.exports.updateUserProfile = async (req, res, next) => {
  try {
    const { fullname, profileImage } = req.body;
    const user = await userModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.fullname = fullname || user.fullname;
    user.profileImage = profileImage || user.profileImage;
    await user.save();
    res.status(200).json({ message: 'Profile updated', user });
  } catch (error) {
    next(error);
  }
};

module.exports.logoutUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }

    await BlacklistToken.create({ token });

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    if (error.code === 110) { // Handle duplicate token
      return res.status(200).json({ message: 'Logged out successfully' });
    }
    next(error);
  }
};

module.exports.getUserRides = async (req, res, next) => {
  try {
    // Mock rides data (replace with actual DB query in production)
    const rides = [
      { id: 1, from: 'Downtown', to: 'Airport', date: '2025-07-05', status: 'Completed', cost: 25 },
      { id: 2, from: 'Park Street', to: 'Mall', date: '2025-07-04', status: 'Pending', cost: 15 },
    ];
    res.status(200).json(rides);
  } catch (error) {
    next(error);
  }
};
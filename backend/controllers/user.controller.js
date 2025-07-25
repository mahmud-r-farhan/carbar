const { validationResult } = require('express-validator');
const userService = require('../services/user.services');
const { sendOTPEmail } = require('../services/email.service');
const { generateOTP, getOTPExpiration } = require('../utils/otp.util');
const blacklistTokenModel = require('../models/blacklistToken.model');
const userModel = require('../models/user.model');

exports.registerUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password } = req.body;

    const existingUser = await userService.findOne({ email });

    if (existingUser) {
      if (!existingUser.verified) {
        const otp = generateOTP();
        const expiresAt = getOTPExpiration();

        existingUser.verificationCode = { code: otp, expiresAt };
        await existingUser.save();
        await sendOTPEmail(email, otp);

        return res.status(200).json({
          message: 'You already registered but not verified. OTP resent to your email.',
          userId: existingUser._id.toString(),
        });
      }
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await userModel.hashPassword(password);
    const otp = generateOTP();
    const expiresAt = getOTPExpiration();

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

exports.verifyUserOTP = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;
    const sanitizedOtp = String(otp).trim();

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.verificationCode || !user.verificationCode.code) {
      return res.status(400).json({ message: 'No OTP associated with this account' });
    }

    const { code: storedOtp, expiresAt } = user.verificationCode;
    if (expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (storedOtp !== sanitizedOtp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    user.verified = true;
    user.verificationCode = undefined;
    await user.save();
    const token = user.generateAuthToken();
    res.status(200).json({ message: 'Account verified', token, user });
  } catch (error) {
    next(error);
  }
};

exports.loginUser = async (req, res, next) => {
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
      maxAge: parseInt(process.env.JWT_COOKIE_MAX_AGE, 10) || 3600000,
      sameSite: 'strict',
    });

    res.status(200).json({ token, user });
  } catch (error) {
    next(error);
  }
};

exports.getUserProfile = async (req, res, next) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    next(error);
  }
};

exports.updateUserProfile = async (req, res, next) => {
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

exports.logoutUser = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }

    await blacklistTokenModel.create({ token }).catch((err) => {
      if (err.code !== 11000) throw err; // Ignore duplicate token error
    });

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getUserRides = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      logger.warn('No user found in request');
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const trips = await Trip.find({ userId: req.user._id }).populate('captainId', 'name vehicle');
    res.status(200).json(
      trips.map((trip) => ({
        id: trip._id,
        from: trip.from?.address || 'N/A',
        to: trip.to?.address || 'N/A',
        date: trip.createdAt,
        status: trip.status || 'unknown',
        cost: trip.finalAmount ?? trip.proposedAmount ?? 0,
        captain: trip.captainId?.name || 'N/A', // Update to match Captain schema
      }))
    );
  } catch (error) {
    logger.error('Error in getUserRides', { error: error.message, stack: error.stack, userId: req.user?._id });
    next(error);
  }
};
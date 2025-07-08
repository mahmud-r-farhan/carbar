const { validationResult } = require('express-validator');
const captainService = require('../services/captain.services');
const { sendOTPEmail } = require('../services/email.service');
const { generateOTP, getOTPExpiration } = require('../utils/otp.util');
const blacklistTokenModel = require('../models/blacklistToken.model');
const captainModel = require('../models/captain.model');

/**
 * Registers a new captain
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.registerCaptain = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password, vehicle } = req.body;

    const existingCaptain = await captainService.findOne({ email });

    if (existingCaptain) {
      if (!existingCaptain.verified) {
        const otp = generateOTP();
        const expiresAt = getOTPExpiration();

        existingCaptain.verificationCode = { code: otp, expiresAt };
        await existingCaptain.save();
        await sendOTPEmail(email, otp);

        return res.status(200).json({
          message: 'You already registered but not verified. OTP resent to your email.',
          captainId: existingCaptain._id.toString(),
        });
      }
      return res.status(400).json({ message: 'Captain already exists' });
    }

    const hashedPassword = await captainModel.hashPassword(password);
    const otp = generateOTP();
    const expiresAt = getOTPExpiration();

    const captain = await captainService.createCaptain({
      firstname: fullname.firstname,
      lastname: fullname.lastname,
      email,
      password: hashedPassword,
      color: vehicle.color,
      plate: vehicle.plate,
      capacity: vehicle.capacity,
      vehicleType: vehicle.vehicleType,
      verificationCode: { code: otp, expiresAt },
    });

    await sendOTPEmail(email, otp);
    res.status(201).json({ message: 'OTP sent to email', captainId: captain._id.toString() });
  } catch (error) {
    next(error);
  }
};

/**
 * Verifies a captain's OTP
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.verifyCaptainOTP = async (req, res, next) => {
  try {
    const { captainId, otp } = req.body;
    const sanitizedOtp = String(otp).trim();

    const captain = await captainModel.findById(captainId);
    if (!captain) {
      return res.status(404).json({ message: 'Captain not found' });
    }
    if (!captain.verificationCode || !captain.verificationCode.code) {
      return res.status(400).json({ message: 'No OTP associated with this account' });
    }

    const { code: storedOtp, expiresAt } = captain.verificationCode;
    if (expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (storedOtp !== sanitizedOtp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    captain.verified = true;
    captain.verificationCode = undefined;
    await captain.save();
    const token = captain.generateAuthToken();
    res.status(200).json({ message: 'Account verified', token, captain });
  } catch (error) {
    next(error);
  }
};

/**
 * Logs in a captain
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.loginCaptain = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const captain = await captainModel.findOne({ email }).select('+password');

    if (!captain || !captain.verified) {
      return res.status(401).json({ message: 'Invalid email or unverified account' });
    }

    const isMatch = await captain.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = captain.generateAuthToken();
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: parseInt(process.env.JWT_COOKIE_MAX_AGE, 10) || 3600000, // 1 hour
      sameSite: 'strict',
    });

    res.status(200).json({ token, captain });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets captain profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getCaptainProfile = async (req, res, next) => {
  try {
    res.status(200).json(req.captain);
  } catch (error) {
    next(error);
  }
};

/**
 * Updates captain profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.updateCaptainProfile = async (req, res, next) => {
  try {
    const { fullname, profileImage } = req.body;
    const captain = await captainModel.findById(req.captain._id);
    if (!captain) {
      return res.status(404).json({ message: 'Captain not found' });
    }
    captain.fullname = fullname || captain.fullname;
    captain.profileImage = profileImage || captain.profileImage;
    await captain.save();
    res.status(200).json({ message: 'Profile updated', captain });
  } catch (error) {
    next(error);
  }
};

/**
 * Logs out a captain
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.logoutCaptain = async (req, res, next) => {
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

/**
 * Gets captain trips
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getCaptainTrips = async (req, res, next) => {
  try {
    const trips = [
      { id: 1, passenger: 'John Doe', from: 'Downtown', to: 'Airport', date: '2025-07-05', status: 'Accepted', earnings: 30 },
      { id: 2, passenger: 'Jane Smith', from: 'Park Street', to: 'Mall', date: '2025-07-04', status: 'Pending', earnings: 20 },
    ];
    res.status(200).json(trips);
  } catch (error) {
    next(error);
  }
};
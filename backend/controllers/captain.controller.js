const captainModel = require('../models/captain.model');
const captainService = require('../services/captain.services');
const { validationResult } = require('express-validator');
const blackListTokenModel = require('../models/blacklistToken.model');
const { sendOTPEmail } = require('../services/email.service');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports.registerCaptain = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password, vehicle } = req.body;

    const isCaptainAlreadyExist = await captainModel.findOne({ email });
    if (isCaptainAlreadyExist) {
      return res.status(400).json({ message: 'Captain already exists' });
    }

    const hashedPassword = await captainModel.hashPassword(password);
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

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

module.exports.verifyCaptainOTP = async (req, res, next) => {
  try {
    const { captainId, otp } = req.body;
    const sanitizedOtp = otp.trim(); // Remove any whitespace
    console.log('Verifying OTP for captainId:', captainId, 'OTP:', sanitizedOtp);

    const captain = await captainModel.findById(captainId);
    if (!captain || !captain.verificationCode) {
      console.log('Invalid captainId or no verification code:', captainId);
      return res.status(400).json({ message: 'Invalid request' });
    }

    console.log('Stored OTP:', captain.verificationCode.code, 'Expires At:', captain.verificationCode.expiresAt);

    if (
      captain.verificationCode.code !== sanitizedOtp ||
      captain.verificationCode.expiresAt < new Date()
    ) {
      console.log('OTP mismatch or expired:', {
        stored: captain.verificationCode.code,
        provided: sanitizedOtp,
        expired: captain.verificationCode.expiresAt < new Date(),
      });
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    captain.verified = true;
    captain.verificationCode = undefined;
    await captain.save();
    const token = captain.generateAuthToken();
    res.status(200).json({ message: 'Account verified', token, captain });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    next(error);
  }
};

module.exports.getCaptainProfile = async (req, res, next) => {
  try {
    res.status(200).json(req.captain);
  } catch (error) {
    next(error);
  }
};

module.exports.updateCaptainProfile = async (req, res, next) => {
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

module.exports.logoutCaptain = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (token) {
      await blackListTokenModel.create({ token });
    }
    res.clearCookie('token');
    res.status(200).json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
};

module.exports.getCaptainTrips = async (req, res, next) => {
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
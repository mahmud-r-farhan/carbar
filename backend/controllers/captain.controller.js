const { validationResult } = require('express-validator');
const captainService = require('../services/captain.services');
const { sendOTPEmail } = require('../services/email.service');
const { clients, activeCaptains } = require('../ws/websocket.service');
const { generateOTP, getOTPExpiration } = require('../utils/otp.util');
const blacklistTokenModel = require('../models/blacklistToken.model');
const captainModel = require('../models/captain.model');
const Trip = require('../models/trip.model');
const logger = require('../config/logger');

exports.registerCaptain = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Captain registration validation failed', { errors: errors.array() });
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
      logger.warn('Captain registration failed: Email already exists', { email });
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
    logger.info('Captain registered successfully', { captainId: captain._id });
    res.status(201).json({ message: 'OTP sent to email', captainId: captain._id.toString() });
  } catch (error) {
    logger.error('Error registering captain:', { error: error.message });
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
      logger.warn('Captain OTP verification failed: Captain not found', { captainId });
      return res.status(404).json({ message: 'Captain not found' });
    }
    if (!captain.verificationCode || !captain.verificationCode.code) {
      logger.warn('Captain OTP verification failed: No OTP found', { captainId });
      return res.status(400).json({ message: 'No OTP associated with this account' });
    }

    const { code: storedOtp, expiresAt } = captain.verificationCode;
    if (expiresAt < new Date()) {
      logger.warn('Captain OTP verification failed: OTP expired', { captainId });
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (storedOtp !== sanitizedOtp) {
      logger.warn('Captain OTP verification failed: Invalid OTP', { captainId });
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    captain.verified = true;
    captain.verificationCode = undefined;
    await captain.save();
    const token = captain.generateAuthToken();
    logger.info('Captain OTP verified successfully', { captainId });
    res.status(200).json({ message: 'Account verified', token, captain });
  } catch (error) {
    logger.error('Error verifying captain OTP:', { error: error.message });
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
      logger.warn('Captain login validation failed', { errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const captain = await captainModel.findOne({ email }).select('+password');

    if (!captain || !captain.verified) {
      logger.warn('Captain login failed: Invalid email or unverified account', { email });
      return res.status(401).json({ message: 'Invalid email or unverified account' });
    }

    const isMatch = await captain.comparePassword(password);
    if (!isMatch) {
      logger.warn('Captain login failed: Invalid credentials', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = captain.generateAuthToken();
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: parseInt(process.env.JWT_COOKIE_MAX_AGE, 10) || 3600000, // 1 hour
      sameSite: 'strict',
    });

    logger.info('Captain logged in successfully', { captainId: captain._id });
    res.status(200).json({ token, captain });
  } catch (error) {
    logger.error('Error logging in captain:', { error: error.message });
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
    logger.info('Captain profile fetched', { captainId: req.captain._id });
    res.status(200).json(req.captain);
  } catch (error) {
    logger.error('Error fetching captain profile:', { error: error.message });
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Captain profile update validation failed', { errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, profileImage, vehicle } = req.body;
    const captain = await captainModel.findById(req.captain._id);
    if (!captain) {
      logger.warn('Captain profile update failed: Captain not found', { captainId: req.captain._id });
      return res.status(404).json({ message: 'Captain not found' });
    }
    captain.fullname = fullname || captain.fullname;
    captain.profileImage = profileImage || captain.profileImage;
    if (vehicle) {
      captain.vehicle = { ...captain.vehicle, ...vehicle };
    }
    await captain.save();
    logger.info('Captain profile updated', { captainId: captain._id });
    res.status(200).json({ message: 'Profile updated', captain });
  } catch (error) {
    logger.error('Error updating captain profile:', { error: error.message });
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
      logger.warn('Captain logout failed: No token provided');
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

    logger.info('Captain logged out successfully', { captainId: req.captain._id });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Error logging out captain:', { error: error.message });
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
    const trips = await Trip.find({ captainId: req.captain._id })
      .populate('userId', 'fullname')
      .sort({ createdAt: -1 });
    res.status(200).json(
      trips.map((trip) => ({
        id: trip._id.toString(),
        passenger: trip.userId ? trip.userId.fullname.firstname : 'N/A',
        from: trip.from.address,
        to: trip.to.address,
        date: trip.createdAt,
        status: trip.status,
        earnings: trip.finalAmount || trip.proposedAmount,
        vehicleType: trip.type,
      }))
    );
    logger.info('Captain trips fetched', { captainId: req.captain._id, tripCount: trips.length });
  } catch (error) {
    logger.error('Error fetching captain trips:', { error: error.message });
    next(error);
  }
};

/**
 * Responds to a trip request (accept/reject)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.respondToTrip = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Trip response validation failed', { errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    const { tripId, action, amount } = req.body;
    const captain = req.captain;
    const trip = await Trip.findById(tripId);

    if (!trip) {
      logger.warn('Trip response failed: Trip not found', { tripId, captainId: captain._id });
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.status !== 'pending') {
      logger.warn('Trip response failed: Trip already handled', { tripId, status: trip.status });
      return res.status(400).json({ message: 'Trip has already been handled' });
    }

    if (action === 'accept') {
      trip.captainId = captain._id;
      trip.status = 'accepted';
      trip.finalAmount = amount || trip.proposedAmount;
      trip.acceptedAt = new Date();
      await trip.save();
      logger.info('Trip accepted by captain', { tripId, captainId: captain._id });

      // Trigger WebSocket trip_response
      const captainClient = require('../services/websocket.service').clients.get(captain._id.toString());
      if (captainClient?.ws.readyState === WebSocket.OPEN) {
        captainClient.ws.send(
          JSON.stringify({
            type: 'trip_response',
            data: { tripId, action: 'accept', amount: trip.finalAmount },
          })
        );
      }

      res.status(200).json({ message: 'Trip accepted', trip });
    } else if (action === 'reject') {
      logger.info('Trip rejected by captain', { tripId, captainId: captain._id });

      // Trigger WebSocket trip_response
      const captainClient = require('../services/websocket.service').clients.get(captain._id.toString());
      if (captainClient?.ws.readyState === WebSocket.OPEN) {
        captainClient.ws.send(
          JSON.stringify({
            type: 'trip_response',
            data: { tripId, action: 'reject' },
          })
        );
      }

      res.status(200).json({ message: 'Trip rejected' });
    } else {
      logger.warn('Invalid trip response action', { tripId, action, captainId: captain._id });
      return res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    logger.error('Error responding to trip:', { error: error.message });
    next(error);
  }
};

/**
 * Updates captain status (active/inactive)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.updateCaptainStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Captain status update validation failed', { errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const captain = await captainModel.findById(req.captain._id);
    if (!captain) {
      logger.warn('Captain status update failed: Captain not found', { captainId: req.captain._id });
      return res.status(404).json({ message: 'Captain not found' });
    }

    captain.status = status;
    await captain.save();
    logger.info('Captain status updated', { captainId: captain._id, status });

    // Update WebSocket activeCaptains
    const activeCaptains = require('../services/websocket.service').activeCaptains;
    if (status === 'active') {
      activeCaptains.set(captain._id.toString(), {
        id: captain._id.toString(),
        location: captain.location,
        vehicle: captain.vehicle,
        status: captain.status,
      });
    } else {
      activeCaptains.delete(captain._id.toString());
    }
    require('../services/websocket.service').broadcastActiveCaptains();

    res.status(200).json({ message: 'Status updated', captain });
  } catch (error) {
    logger.error('Error updating captain status:', { error: error.message });
    next(error);
  }
};

module.exports = exports;
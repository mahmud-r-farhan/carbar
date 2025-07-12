const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const { auth } = require('../middlewares/auth.middleware');
const Trip = require('../models/trip.model');
const userModel = require('../models/user.model');
const logger = require('../config/logger');

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('fullname.firstname').isLength({ min: 3 }).withMessage('First name must be at least 3 characters long'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ],
  userController.registerUser
);

router.post(
  '/verify-otp',
  [
    body('userId').isMongoId().withMessage('Invalid user ID'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  userController.verifyUserOTP
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ],
  userController.loginUser
);

router.get('/profile', auth, async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user._id).select('-password -__v');
    if (!user) {
      logger.warn('User profile not found', { userId: req.user._id });
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      user: {
        _id: user._id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        verified: user.verified,
        profileImage: user.profileImage || '',
        socketId: user.socketId || null,
      },
    });
    logger.info('User profile fetched', { userId: req.user._id });
  } catch (error) {
    logger.error('Error fetching user profile:', { error: error.message });
    next(error);
  }
});

router.post(
  '/update-profile',
  auth,
  [
    body('fullname.firstname')
      .optional()
      .isLength({ min: 3 })
      .withMessage('First name must be at least 3 characters long'),
    body('fullname.lastname')
      .optional()
      .isLength({ min: 3 })
      .withMessage('Last name must be at least 3 characters long'),
    body('profileImage').optional().isURL().withMessage('Invalid profile image URL'),
  ],
  userController.updateUserProfile
);

router.get('/rides', auth, userController.getUserRides);

router.post('/logout', auth, userController.logoutUser);

router.post(
  '/book-ride',
  auth,
  [
    body('from.address').notEmpty().withMessage('Pickup address is required'),
    body('from.coordinates.lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid pickup latitude'),
    body('from.coordinates.lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid pickup longitude'),
    body('to.address').notEmpty().withMessage('Destination address is required'),
    body('to.coordinates.lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid destination latitude'),
    body('to.coordinates.lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid destination longitude'),
    body('type').isIn(['ride', 'parcel']).withMessage('Invalid trip type'),
    body('proposedAmount').isFloat({ min: 0 }).withMessage('Proposed amount must be non-negative'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Book ride validation failed', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
      }

      const { from, to, type, proposedAmount } = req.body;
      const trip = await Trip.create({
        userId: req.user._id,
        from,
        to,
        type,
        proposedAmount,
        status: 'pending',
        createdAt: new Date(),
      });

      // Trigger WebSocket trip_request
      const { clients } = require('../services/websocket.service');
      const userClient = clients.get(req.user._id.toString());
      if (userClient?.ws.readyState === WebSocket.OPEN) {
        userClient.ws.send(
          JSON.stringify({
            type: 'trip_request',
            data: {
              origin: from,
              destination: to,
              proposedAmount,
              vehicleType: type,
              tripId: trip._id.toString(),
            },
          })
        );
        logger.info('WebSocket trip_request sent', { tripId: trip._id, userId: req.user._id });
      } else {
        logger.warn('User not connected to WebSocket for trip request', { userId: req.user._id });
      }

      res.status(201).json({ message: 'Ride booked', trip: { id: trip._id, ...req.body } });
    } catch (error) {
      logger.error('Error booking ride:', { error: error.message });
      next(error);
    }
  }
);

module.exports = router;
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const { auth } = require('../middlewares/auth.middleware');

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

router.get('/profile', auth, userController.getUserProfile);

router.post( // Change to POST to match controller
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
    body('from.coordinates.lat').isFloat().withMessage('Invalid pickup latitude'),
    body('from.coordinates.lng').isFloat().withMessage('Invalid pickup longitude'),
    body('to.address').notEmpty().withMessage('Destination address is required'),
    body('to.coordinates.lat').isFloat().withMessage('Invalid destination latitude'),
    body('to.coordinates.lng').isFloat().withMessage('Invalid destination longitude'),
    body('type').isIn(['ride', 'parcel']).withMessage('Invalid trip type'),
    body('proposedAmount').isFloat({ min: 0 }).withMessage('Proposed amount must be non-negative'),
  ],
  async (req, res, next) => {
    try {
      const { from, to, type, proposedAmount } = req.body;
      const trip = await Trip.create({
        userId: req.user._id,
        from,
        to,
        type,
        proposedAmount,
      });
      res.status(201).json({ message: 'Ride booked', trip });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
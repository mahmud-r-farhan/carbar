const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const captainController = require('../controllers/captain.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('fullname.firstname').isLength({ min: 3 }).withMessage('First name must be at least 3 characters long'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('vehicle.color').isLength({ min: 3 }).withMessage('Color must be at least 3 characters long'),
    body('vehicle.plate').isLength({ min: 4 }).withMessage('Plate must be at least 4 characters long'),
    body('vehicle.capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('vehicle.vehicleType')
      .isIn(['car', 'motorcycle', 'auto', 'cng', 'bicycle'])
      .withMessage('Invalid vehicle type'),
  ],
  captainController.registerCaptain
);

router.post(
  '/verify-otp',
  [
    body('captainId').isMongoId().withMessage('Invalid captain ID'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  captainController.verifyCaptainOTP
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ],
  captainController.loginCaptain
);

router.get('/profile', authMiddleware.authCaptain, captainController.getCaptainProfile);

router.post(
  '/update-profile',
  authMiddleware.authCaptain,
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
  captainController.updateCaptainProfile
);

router.get('/trips', authMiddleware.authCaptain, captainController.getCaptainTrips);

router.get('/logout', authMiddleware.authCaptain, captainController.logoutCaptain);

module.exports = router;
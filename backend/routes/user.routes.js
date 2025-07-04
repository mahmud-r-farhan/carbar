const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/register', [
  body('email').isEmail().withMessage('Invalid Email'),
  body('fullname.firstname').isLength({ min: 3 }).withMessage('First name must be at least 3 characters long'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
], userController.registerUser);

router.post('/login', [
  body('email').isEmail().withMessage('Invalid Email'),
  body('password').isLength({ min: 6 }).withMessage('Incorrect Password'),
], userController.loginUser);

router.get('/profile', authMiddleware.authUser, userController.getUserProfile);
router.get('/logout', authMiddleware.authUser, userController.logoutUser);

router.post('/book-ride', authMiddleware.authUser, [
  body('from').notEmpty().withMessage('Pickup location is required'),
  body('to').notEmpty().withMessage('Destination is required'),
], async (req, res) => {
  try {
    const { from, to } = req.body;
    // Dummy ride creation
    const ride = {
      userId: req.user._id,
      from,
      to,
      status: 'Pending',
      date: new Date(),
      cost: Math.floor(Math.random() * 50) + 10,
    };
    res.status(201).json({ message: 'Ride booked', ride });
  } catch (error) {
    res.status(500).json({ message: 'Failed to book ride', error: error.message });
  }
});

module.exports = router;
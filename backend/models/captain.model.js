const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const captainSchema = new mongoose.Schema({
  fullname: {
    firstname: { type: String, required: true, minlength: 3 },
    lastname: { type: String, minlength: 3 },
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  socketId: String,
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'inactive',
  },
  vehicle: {
    color: { type: String, required: true },
    plate: { type: String, required: true, minlength: 4 },
    capacity: { type: Number, required: true, min: 1 },
    vehicleType: {
      type: String,
      required: true,
      enum: ['car', 'motorcycle', 'auto', 'cng', 'bicycle'],
    },
  },
  location: {
    lat: Number,
    lng: Number,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  verificationCode: {
    code: String,
    expiresAt: Date,
  },
  profileImage: {
    type: String,
    default: '',
  },
});

/**
 * Generates JWT token for the captain
 * @returns {string} JWT token
 */
captainSchema.methods.generateAuthToken = function () {
  return jwt.sign({ _id: this._id, role: 'captain' }, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });
};

/**
 * Compares provided password with stored hash
 * @param {string} password - Plain text password
 * @returns {Promise<boolean>} True if passwords match
 */
captainSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

/**
 * Hashes a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
captainSchema.statics.hashPassword = async function (password) {
  return await bcrypt.hash(password, 10);
};

module.exports = mongoose.model('Captain', captainSchema);
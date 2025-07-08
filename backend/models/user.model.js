const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  fullname: {
    firstname: { type: String, required: true, minlength: 3 },
    lastname: { type: String, minlength: 3 },
  },
  email: {
    type: String,
    required: true,
    unique: true,
    minlength: 5,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  socketId: String,
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
 * Generates JWT token for the user
 * @returns {string} JWT token
 */
userSchema.methods.generateAuthToken = function () {
  return jwt.sign({ _id: this._id, role: 'user' }, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });
};

/**
 * Compares provided password with stored hash
 * @param {string} password - Plain text password
 * @returns {Promise<boolean>} True if passwords match
 */
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

/**
 * Hashes a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
userSchema.statics.hashPassword = async function (password) {
  return await bcrypt.hash(password, 10);
};

module.exports = mongoose.model('User', userSchema);
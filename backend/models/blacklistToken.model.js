const mongoose = require('mongoose');

const blacklistTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '24h', // Auto-remove after 24 hours
  },
});

module.exports = mongoose.model('BlacklistToken', blacklistTokenSchema);
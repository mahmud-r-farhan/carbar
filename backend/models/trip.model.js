const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  captainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Captain' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  from: {
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  },
  to: {
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  },
  type: { type: String, enum: ['ride', 'parcel'], required: true },
  proposedAmount: { type: Number, required: true },
  finalAmount: Number,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  messages: [
    {
      sender: { type: mongoose.Schema.Types.ObjectId, required: true },
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  acceptedAt: Date,
  completedAt: Date,
});

module.exports = mongoose.model('Trip', tripSchema);
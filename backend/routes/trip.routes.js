const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator'); // Added validationResult
const Trip = require('../models/trip.model');
const { clients, activeCaptains } = require('../ws/websocket.service');
const { auth, authUser, authCaptain } = require('../middlewares/auth.middleware');
const logger = require('../config/logger');
const User = require('../models/user.model'); // For sender name lookup
const Captain = require('../models/captain.model');
const WebSocket = require('ws');

/**
 * Get trip details
 */
router.get(
  '/:tripId',
  auth,
  [param('tripId').isMongoId().withMessage('Invalid trip ID')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Get trip validation failed', {
          errors: errors.array(),
          tripId: req.params.tripId,
          userId: req.entity._id,
        });
        return res.status(400).json({ errors: errors.array() });
      }

      const trip = await Trip.findById(req.params.tripId)
        .populate('userId', 'fullname')
        .populate('captainId', 'fullname vehicle');
      if (!trip) {
        logger.warn('Trip not found', {
          tripId: req.params.tripId,
          userId: req.entity._id,
        });
        return res.status(404).json({ message: 'Trip not found' });
      }

      if (
        trip.userId._id.toString() !== req.entity._id.toString() &&
        trip.captainId?._id.toString() !== req.entity._id.toString()
      ) {
        logger.warn('Unauthorized trip access', {
          tripId: req.params.tripId,
          userId: req.entity._id,
        });
        return res.status(403).json({ message: 'Unauthorized access to trip' });
      }

      res.status(200).json({
        id: trip._id,
        user: trip.userId ? trip.userId.fullname : null,
        captain: trip.captainId ? { ...trip.captainId.fullname, vehicle: trip.captainId.vehicle } : null,
        from: trip.from,
        to: trip.to,
        type: trip.type,
        proposedAmount: trip.proposedAmount,
        finalAmount: trip.finalAmount,
        status: trip.status,
        createdAt: trip.createdAt,
        acceptedAt: trip.acceptedAt,
        completedAt: trip.completedAt,
      });
      logger.info('Trip fetched', { tripId: trip._id, userId: req.entity._id });
    } catch (error) {
      logger.error('Error fetching trip:', {
        error: error.message,
        tripId: req.params.tripId,
        userId: req.entity._id,
      });
      next(error);
    }
  }
);

/**
 * Get trip messages
 */
router.get(
  '/:tripId/messages',
  auth,
  [param('tripId').isMongoId().withMessage('Invalid trip ID')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Get trip messages validation failed', {
          errors: errors.array(),
          tripId: req.params.tripId,
          userId: req.entity._id,
        });
        return res.status(400).json({ errors: errors.array() });
      }

      const trip = await Trip.findById(req.params.tripId);
      if (!trip) {
        logger.warn('Trip messages not found', {
          tripId: req.params.tripId,
          userId: req.entity._id,
        });
        return res.status(404).json({ message: 'Trip not found' });
      }

      if (
        trip.userId.toString() !== req.entity._id.toString() &&
        trip.captainId?.toString() !== req.entity._id.toString()
      ) {
        logger.warn('Unauthorized trip messages access', {
          tripId: req.params.tripId,
          userId: req.entity._id,
        });
        return res.status(403).json({ message: 'Unauthorized access to trip messages' });
      }

      // Fetch sender names for messages
      const messages = await Promise.all(
        trip.messages.map(async (msg) => {
          let senderName = msg.senderName;
          if (!senderName) {
            const sender = await (msg.sender.toString() === trip.userId.toString()
              ? User
              : Captain
            ).findById(msg.sender);
            senderName = sender?.fullname?.firstname || 'Unknown';
          }
          return {
            _id: msg._id,
            sender: msg.sender.toString() === req.entity._id.toString() ? 'You' : senderName,
            senderName,
            text: msg.text,
            timestamp: msg.timestamp,
          };
        })
      );

      res.status(200).json({ messages });
      logger.info('Trip messages fetched', { tripId: trip._id, userId: req.entity._id });
    } catch (error) {
      logger.error('Error fetching trip messages:', {
        error: error.message,
        tripId: req.params.tripId,
        userId: req.entity._id,
      });
      next(error);
    }
  }
);

/**
 * Update trip status (e.g., in_progress, completed, cancelled)
 */
router.patch(
  '/:tripId/status',
  auth,
  [
    param('tripId').isMongoId().withMessage('Invalid trip ID'),
    body('status')
      .isIn(['in_progress', 'completed', 'cancelled'])
      .withMessage('Invalid status'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Trip status update validation failed', {
          errors: errors.array(),
          tripId: req.params.tripId,
          userId: req.entity._id,
        });
        return res.status(400).json({ errors: errors.array() });
      }

      const { tripId } = req.params;
      const { status } = req.body;
      const trip = await Trip.findById(tripId);
      if (!trip) {
        logger.warn('Trip status update failed: Trip not found', {
          tripId,
          userId: req.entity._id,
        });
        return res.status(404).json({ message: 'Trip not found' });
      }

      if (
        trip.userId.toString() !== req.entity._id.toString() &&
        trip.captainId?.toString() !== req.entity._id.toString()
      ) {
        logger.warn('Unauthorized trip status update', {
          tripId,
          userId: req.entity._id,
        });
        return res.status(403).json({ message: 'Unauthorized to update trip status' });
      }

      // Validate state transitions
      const validTransitions = {
        pending: ['in_progress', 'cancelled'],
        accepted: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'cancelled'],
        completed: [],
        cancelled: [],
      };
      if (!validTransitions[trip.status].includes(status)) {
        logger.warn('Invalid trip status transition', {
          tripId,
          currentStatus: trip.status,
          newStatus: status,
          userId: req.entity._id,
        });
        return res.status(400).json({
          message: `Cannot transition from ${trip.status} to ${status}`,
        });
      }

      trip.status = status;
      if (status === 'completed') trip.completedAt = new Date();
      await trip.save();

      // Send WebSocket notification
      const message = JSON.stringify({
        type: 'trip_status_update',
        data: { tripId: trip._id.toString(), status },
      });

      const userClient = clients.get(trip.userId.toString());
      const captainClient = trip.captainId ? clients.get(trip.captainId.toString()) : null;

      if (userClient?.ws.readyState === WebSocket.OPEN) {
        userClient.ws.send(message);
        logger.info('Trip status update sent to user', {
          tripId,
          userId: trip.userId.toString(),
        });
      } else {
        logger.warn('User client not connected for status update', {
          tripId,
          userId: trip.userId.toString(),
        });
      }

      if (captainClient?.ws.readyState === WebSocket.OPEN) {
        captainClient.ws.send(message);
        logger.info('Trip status update sent to captain', {
          tripId,
          captainId: trip.captainId?.toString(),
        });
      } else if (trip.captainId) {
        logger.warn('Captain client not connected for status update', {
          tripId,
          captainId: trip.captainId.toString(),
        });
      }

      // Notify active captains if trip is cancelled to make it available again
      if (status === 'cancelled' && trip.captainId) {
        const cancelMessage = JSON.stringify({
          type: 'trip_cancelled',
          data: { tripId: trip._id.toString() },
        });
        activeCaptains.forEach((captain) => {
          const client = clients.get(captain.id.toString());
          if (
            client?.ws.readyState === WebSocket.OPEN &&
            captain.vehicle.vehicleType === trip.type &&
            captain.status === 'active'
          ) {
            client.ws.send(cancelMessage);
            logger.info('Notified captain of trip cancellation', {
              tripId,
              captainId: captain.id,
            });
          }
        });
      }

      res.status(200).json({
        message: 'Trip status updated',
        trip: {
          id: trip._id,
          status: trip.status,
          from: trip.from,
          to: trip.to,
          type: trip.type,
          proposedAmount: trip.proposedAmount,
          finalAmount: trip.finalAmount,
          createdAt: trip.createdAt,
          acceptedAt: trip.acceptedAt,
          completedAt: trip.completedAt,
        },
      });
      logger.info('Trip status updated', { tripId, status, userId: req.entity._id });
    } catch (error) {
      logger.error('Error updating trip status:', {
        error: error.message,
        tripId: req.params.tripId,
        userId: req.entity._id,
      });
      next(error);
    }
  }
);

module.exports = router;
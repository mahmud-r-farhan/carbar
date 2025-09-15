const logger = require('../config/logger');
const sanitizeHtml = require('sanitize-html');
const Joi = require('joi');
const Trip = require('../models/trip.model');
const Subscription = require('../models/subscription.model');
const webpush = require('web-push');
const Captain = require('../models/captain.model');

// Joi schemas
const tripDataSchema = Joi.object({
  origin: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    address: Joi.string().required(),
  }).required(),
  destination: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    address: Joi.string().required(),
  }).required(),
  proposedAmount: Joi.number().positive().required(),
  vehicleType: Joi.string().valid('sedan', 'suv', 'truck').required(),
});
const tripResponseSchema = Joi.object({
  tripId: Joi.string().required(),
  action: Joi.string().valid('accept', 'reject').required(),
  amount: Joi.number().positive().optional(),
});
const tripStatusSchema = Joi.object({
  tripId: Joi.string().required(),
  status: Joi.string().valid('in_progress', 'completed', 'cancelled').required(),
});
const chatMessageSchema = Joi.object({
  tripId: Joi.string().required(),
  message: Joi.string().max(1000).required(),
});

// Helper functions for sending messages back
function sendToClient(clientId, message, clients) {
  const client = clients.get(clientId.toString());
  if (client?.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
}

async function sendPushNotification(userId, title, body) {
  try {
    const subscription = await Subscription.findOne({ userId });
    if (subscription) {
      const payload = JSON.stringify({ title, body });
      await webpush.sendNotification(subscription, payload);
    }
  } catch (err) {
    if (err.statusCode === 410) {
      await Subscription.deleteOne({ endpoint: subscription.endpoint });
      logger.warn(`Removed expired subscription: ${subscription.endpoint}`, { timestamp: new Date() });
    } else {
      logger.error('Error sending push notification', { error: err.message, userId, timestamp: new Date() });
    }
  }
}

async function handleTripRequest(user, tripData, clients, redisClient) {
  try {
    const { error } = tripDataSchema.validate(tripData);
    if (error) {
      sendToClient(user._id, { type: 'trip_request_failed', message: error.message }, clients);
      return;
    }
    const trip = await Trip.create({
      userId: user._id,
      from: tripData.origin,
      to: tripData.destination,
      type: tripData.vehicleType,
      proposedAmount: tripData.proposedAmount,
      status: 'pending',
      createdAt: new Date(),
    });

    const message = JSON.stringify({
      type: 'new_trip_request',
      data: {
        tripId: trip._id,
        origin: trip.from,
        destination: trip.to,
        proposedAmount: trip.proposedAmount,
        vehicleType: trip.type,
        userId: user._id,
      },
    });

    const captainsNotified = [];
    const { getAllActiveCaptainsFromRedis } = require('./websocket.captainHandler');
    const activeCaptains = await getAllActiveCaptainsFromRedis(redisClient);

    activeCaptains.forEach((captain) => {
      if (captain.vehicle.vehicleType === trip.type && captain.status === 'active') {
        sendToClient(captain.id, message, clients);
        captainsNotified.push(captain.id);
      }
    });

    // Send push notifications
    const subscriptions = await Subscription.find({ userId: { $in: captainsNotified } });
    const payload = JSON.stringify({
      title: 'New Trip Request',
      body: `From: ${trip.from.address} To: ${trip.to.address}. Amount: $${trip.proposedAmount}`,
    });
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err) {
        if (err.statusCode === 410) {
          await Subscription.deleteOne({ endpoint: sub.endpoint });
          logger.warn(`Removed expired subscription: ${sub.endpoint}`, { timestamp: new Date() });
        }
      }
    }

    sendToClient(user._id, { type: 'trip_request_sent', data: { tripId: trip._id } }, clients);
  } catch (error) {
    logger.error('Error creating trip', { error: error.message, timestamp: new Date() });
    sendToClient(user._id, { type: 'trip_request_failed', message: 'Server error creating trip' }, clients);
  }
}

async function handleTripResponse(captain, data, clients, redisClient) {
  try {
    const { error } = tripResponseSchema.validate(data);
    if (error) {
      sendToClient(captain._id, { type: 'trip_response_failed', message: error.message }, clients);
      return;
    }
    const { tripId, action, amount } = data;
    const trip = await Trip.findById(tripId);
    if (!trip) {
      sendToClient(captain._id, { type: 'trip_response_failed', message: 'Trip not found' }, clients);
      return;
    }
    if (trip.status !== 'pending') {
      sendToClient(captain._id, { type: 'trip_already_handled', message: 'This trip has already been handled' }, clients);
      return;
    }

    if (action === 'accept') {
      trip.captainId = captain._id;
      trip.status = 'accepted';
      trip.finalAmount = amount || trip.proposedAmount;
      trip.acceptedAt = new Date();
      await trip.save();

      const userClientMessage = {
        type: 'trip_accepted',
        data: {
          tripId: trip._id,
          captainId: captain._id,
          captainInfo: {
            fullname: captain.fullname,
            vehicle: captain.vehicle,
            phone: captain.phone || 'N/A',
          },
          finalAmount: trip.finalAmount,
          status: trip.status,
        },
      };
      sendToClient(trip.userId, userClientMessage, clients);

      await sendPushNotification(trip.userId, 'Trip Accepted', `Captain ${captain.fullname.firstname} accepted your trip for $${trip.finalAmount}`);

      const { getAllActiveCaptainsFromRedis } = require('./websocket.captainHandler');
      const activeCaptains = await getAllActiveCaptainsFromRedis(redisClient);
      activeCaptains.forEach((c) => {
        if (c.id.toString() !== captain._id.toString()) {
          sendToClient(c.id, { type: 'trip_taken', data: { tripId: trip._id } }, clients);
        }
      });

    } else if (action === 'reject') {
      sendToClient(trip.userId, { type: 'captain_rejected_trip', data: { tripId: trip._id, captainId: captain._id } }, clients);
      await sendPushNotification(trip.userId, 'Trip Rejected', `A captain rejected your trip request. Finding another captain...`);
    }
  } catch (error) {
    logger.error('Error handling trip response', { error: error.message, timestamp: new Date() });
    sendToClient(captain._id, { type: 'trip_response_failed', message: 'Server error processing response' }, clients);
  }
}

async function handleTripStatusUpdate(user, data, clients, redisClient) {
  try {
    const { error } = tripStatusSchema.validate(data);
    if (error) {
      sendToClient(user._id, { type: 'trip_status_update_failed', message: error.message }, clients);
      return;
    }
    const { tripId, status } = data;
    const trip = await Trip.findById(tripId);
    if (!trip) {
      sendToClient(user._id, { type: 'trip_status_update_failed', message: 'Trip not found' }, clients);
      return;
    }
    if (
      trip.userId.toString() !== user._id.toString() &&
      trip.captainId?.toString() !== user._id.toString()
    ) {
      sendToClient(user._id, { type: 'trip_status_update_failed', message: 'Unauthorized action' }, clients);
      return;
    }
    const validTransitions = {
      pending: ['in_progress', 'cancelled'],
      accepted: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };
    if (!validTransitions[trip.status].includes(status)) {
      sendToClient(user._id, { type: 'trip_status_update_failed', message: `Cannot transition from ${trip.status} to ${status}` }, clients);
      return;
    }
    trip.status = status;
    if (status === 'completed') trip.completedAt = new Date();
    await trip.save();
    const message = {
      type: 'trip_status_update',
      data: { tripId: trip._id.toString(), status },
    };

    sendToClient(trip.userId, message, clients);
    if (trip.captainId) {
      sendToClient(trip.captainId, message, clients);
    }

    const userIds = [trip.userId];
    if (trip.captainId) userIds.push(trip.captainId);
    const subscriptions = await Subscription.find({ userId: { $in: userIds } });
    const payload = JSON.stringify({
      title: `Trip ${status}`,
      body: `Trip ${trip._id} is now ${status}`,
    });
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err) {
        if (err.statusCode === 410) {
          await Subscription.deleteOne({ endpoint: sub.endpoint });
          logger.warn(`Removed expired subscription: ${sub.endpoint}`, { timestamp: new Date() });
        }
      }
    }
  } catch (error) {
    logger.error('Error updating trip status', { error: error.message, timestamp: new Date() });
    sendToClient(user._id, { type: 'trip_status_update_failed', message: 'Server error updating status' }, clients);
  }
}

async function handleChatMessage(sender, data, clients, redisClient) {
  try {
    const { error } = chatMessageSchema.validate(data);
    if (error) {
      sendToClient(sender._id, { type: 'chat_error', message: error.message }, clients);
      return;
    }
    const { tripId, message } = data;
    const trip = await Trip.findById(tripId);
    if (!trip) {
      sendToClient(sender._id, { type: 'chat_error', message: 'Trip not found' }, clients);
      return;
    }
    let receiverId = null;
    if (sender._id.toString() === trip.userId.toString()) {
      receiverId = trip.captainId;
    } else if (trip.captainId && sender._id.toString() === trip.captainId.toString()) {
      receiverId = trip.userId;
    } else {
      sendToClient(sender._id, { type: 'chat_error', message: 'You are not authorized for this chat' }, clients);
      return;
    }
    const msgObj = {
      sender: sender._id,
      senderName: sender.fullname.firstname || 'Guest',
      text: sanitizeHtml(message.trim(), { allowedTags: [], allowedAttributes: {} }),
      timestamp: new Date(),
    };
    trip.messages.push(msgObj);
    await trip.save();

    const baseClientMsg = {
      type: 'chat_message',
      data: {
        tripId: tripId.toString(),
        message: {
          id: msgObj._id.toString(),
          text: msgObj.text,
          timestamp: msgObj.timestamp,
        },
      },
    };

    if (receiverId) {
      const receiverClientMsg = JSON.parse(JSON.stringify(baseClientMsg));
      receiverClientMsg.data.message.sender = sender.fullname.firstname || 'Other User';
      sendToClient(receiverId, receiverClientMsg, clients);

      await sendPushNotification(receiverId, 'New Chat Message', `${sender.fullname.firstname}: ${msgObj.text}`);
    }

    const senderClientMsg = JSON.parse(JSON.stringify(baseClientMsg));
    senderClientMsg.data.message.sender = sender.fullname.firstname || 'You';
    sendToClient(sender._id, senderClientMsg, clients);
  } catch (error) {
    logger.error('Error sending chat message', { error: error.message, timestamp: new Date() });
    sendToClient(sender._id, { type: 'chat_error', message: 'Server error sending message' }, clients);
  }
}

module.exports = {
  handleTripRequest,
  handleTripResponse,
  handleTripStatusUpdate,
  handleChatMessage,
};
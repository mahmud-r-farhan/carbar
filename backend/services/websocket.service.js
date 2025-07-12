const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html');
const { createClient } = require('redis');
const Captain = require('../models/captain.model');
const User = require('../models/user.model');
const Trip = require('../models/trip.model');
const Subscription = require('../models/subscription.model');
const webpush = require('web-push');
const logger = require('../config/logger');
const Joi = require('joi');
const env = require('../config/env');

// Redis clients
const redisPublisher = createClient({ url: env.REDIS_URL });
const redisSubscriber = createClient({ url: env.REDIS_URL });

// Redis error handling and reconnection
redisPublisher.on('error', (err) => logger.error('Redis publisher error', { error: err.message }));
redisSubscriber.on('error', (err) => logger.error('Redis subscriber error', { error: err.message }));
redisPublisher.on('reconnecting', () => logger.info('Redis publisher reconnecting'));
redisSubscriber.on('reconnecting', () => logger.info('Redis subscriber reconnecting'));

async function connectRedis() {
  try {
    await redisPublisher.connect();
    await redisSubscriber.connect();
    logger.info('Redis clients connected successfully');
  } catch (err) {
    logger.error('Failed to connect to Redis', { error: err.message });
    process.exit(1);
  }
}
connectRedis();

// Subscribe to Redis broadcast channel
redisSubscriber.subscribe('broadcast', (message) => {
  try {
    const data = JSON.parse(message);
    broadcastFromRedis(data);
  } catch (err) {
    logger.error('Error parsing Redis message', { error: err.message });
  }
});

// In-memory client tracking
const clients = new Map();

// WebSocket close codes
const WS_CLOSE_CODES = {
  AUTH_REQUIRED: 4001,
  INVALID_USER: 4002,
  AUTH_FAILED: 4003,
  INTERNAL_SERVER_ERROR: 4004,
  INVALID_MESSAGE: 4005,
};

// Input validation schemas
const locationSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
});

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

const statusUpdateSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive').required(),
});

function initWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: env.WS_PATH });

  wss.on('connection', async (ws, req) => {
    let userId = null;
    let userRole = null;

    ws._socket.setTimeout(30000, () => {
      logger.warn('WebSocket connection timed out', { remoteAddress: ws._socket.remoteAddress });
      ws.terminate();
    });

    try {
      if (!req.url.startsWith(env.WS_PATH)) {
        logger.error('Invalid WebSocket path', { url: req.url, remoteAddress: ws._socket.remoteAddress });
        ws.close(WS_CLOSE_CODES.INTERNAL_SERVER_ERROR, 'Invalid WebSocket path');
        return;
      }

      const url = new URL(req.url, env.WS_BASE_URL);
      const token = url.searchParams.get('token');

      if (!token) {
        logger.warn('WebSocket connection attempt without token', { remoteAddress: ws._socket.remoteAddress });
        ws.close(WS_CLOSE_CODES.AUTH_REQUIRED, 'Authentication required');
        return;
      }

      let decoded;
      try {
        decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
        if (!decoded._id || !decoded.role || !['user', 'captain'].includes(decoded.role)) {
          throw new Error('Invalid token claims');
        }
      } catch (jwtErr) {
        logger.warn('WebSocket connection: JWT verification failed', { error: jwtErr.message });
        ws.close(WS_CLOSE_CODES.AUTH_FAILED, 'Authentication failed. Invalid token');
        return;
      }

      const user = decoded.role === 'captain'
        ? await Captain.findById(decoded._id)
        : await User.findById(decoded._id);
      if (!user) {
        logger.warn('WebSocket connection: User not found', { userId: decoded._id });
        ws.close(WS_CLOSE_CODES.INVALID_USER, 'Invalid user');
        return;
      }

      userId = user._id.toString();
      userRole = decoded.role;

      user.socketId = `${ws._socket.remoteAddress}:${ws._socket.remotePort}`;
      await user.save();

      if (clients.has(userId)) {
        logger.info(`Closing existing WebSocket connection for user`, { userId });
        clients.get(userId).ws.close(1000, 'New connection established');
      }

      clients.set(userId, { ws, user, role: userRole });
      logger.info(`WebSocket connected`, { userId, role: userRole });

      if (userRole === 'captain') {
        const captainData = {
          id: userId,
          location: user.location || null,
          vehicle: user.vehicle,
          status: user.status,
        };
        await updateActiveCaptainsInRedis(userId, captainData);
        broadcastActiveCaptains();
      }

      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', async (messageData) => {
        try {
          const message = JSON.parse(messageData);
          if (!message.type || !message.data) {
            logger.warn('Invalid message format', { userId, messageData: messageData.toString() });
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
            return;
          }

          switch (message.type) {
            case 'location_update':
              if (userRole === 'captain') {
                await handleLocationUpdate(user, message.data);
              } else {
                ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized action' }));
              }
              break;
            case 'trip_request':
              if (userRole === 'user') {
                await handleTripRequest(user, message.data);
              } else {
                ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized action' }));
              }
              break;
            case 'trip_response':
              if (userRole === 'captain') {
                await handleTripResponse(user, message.data);
              } else {
                ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized action' }));
              }
              break;
            case 'trip_status_update':
              await handleTripStatusUpdate(user, message.data);
              break;
            case 'chat_message':
              await handleChatMessage(user, message.data);
              break;
            case 'status_update':
              if (userRole === 'captain') {
                await handleStatusUpdate(user, message.data);
              } else {
                ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized action' }));
              }
              break;
            default:
              ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${message.type}` }));
          }
        } catch (err) {
          logger.error(`Error handling message from user ${userId}`, { error: err.message });
          ws.send(JSON.stringify({ type: 'error', message: 'Server error processing your message' }));
        }
      });

      ws.on('close', async (code, reason) => {
        logger.info(`WebSocket disconnected`, { userId: userId || 'N/A', code, reason: reason.toString() });
        if (userId) {
          clients.delete(userId);
          if (userRole === 'captain') {
            await removeActiveCaptainFromRedis(userId);
            broadcastActiveCaptains();
            await (userRole === 'captain' ? Captain : User).findByIdAndUpdate(userId, { socketId: null });
          }
        }
      });

      ws.on('error', (err) => {
        logger.error(`WebSocket error for user ${userId || 'N/A'}`, { error: err.message });
      });
    } catch (err) {
      logger.error('WebSocket connection error', { error: err.message, url: req.url });
      ws.close(WS_CLOSE_CODES.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        logger.warn('Terminating stale WebSocket connection', { remoteAddress: ws._socket.remoteAddress });
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 60000);

  wss.on('close', () => {
    clearInterval(interval);
    logger.info('WebSocket server closed');
  });

  async function updateActiveCaptainsInRedis(userId, captainData) {
    try {
      await redisPublisher.set(`activeCaptain:${userId}`, JSON.stringify(captainData), { EX: 3600 });
    } catch (err) {
      logger.error('Failed to update active captains in Redis', { error: err.message });
    }
  }

  async function removeActiveCaptainFromRedis(userId) {
    try {
      await redisPublisher.del(`activeCaptain:${userId}`);
    } catch (err) {
      logger.error('Failed to remove active captain from Redis', { error: err.message });
    }
  }

  async function getAllActiveCaptainsFromRedis() {
    try {
      const keys = await redisPublisher.keys('activeCaptain:*');
      const captains = [];
      for (const key of keys) {
        const data = await redisPublisher.get(key);
        if (data) captains.push(JSON.parse(data));
      }
      return captains;
    } catch (err) {
      logger.error('Failed to fetch active captains from Redis', { error: err.message });
      return [];
    }
  }

  async function broadcastActiveCaptains() {
    const captainsList = await getAllActiveCaptainsFromRedis();
    const message = JSON.stringify({ type: 'active_captains', data: captainsList });
    redisPublisher.publish('broadcast', message);
  }

  function broadcastFromRedis(message) {
    clients.forEach(({ ws, role }) => {
      if (role === 'user' && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  async function handleLocationUpdate(user, location) {
    const { error } = locationSchema.validate(location);
    if (error) {
      logger.warn(`Invalid location update from captain ${user._id}`, { location, error: error.message });
      return;
    }
    try {
      await Captain.findByIdAndUpdate(user._id, { location });
      const captainData = {
        id: user._id.toString(),
        location,
        vehicle: user.vehicle,
        status: user.status,
      };
      await updateActiveCaptainsInRedis(user._id.toString(), captainData);
      broadcastActiveCaptains();
    } catch (error) {
      logger.error(`Failed to update location for captain ${user._id}`, { error: error.message });
    }
  }

  async function handleTripRequest(user, tripData) {
    try {
      const { error } = tripDataSchema.validate(tripData);
      if (error) {
        const userClient = clients.get(user._id.toString());
        if (userClient?.ws.readyState === WebSocket.OPEN) {
          userClient.ws.send(JSON.stringify({ type: 'trip_request_failed', message: error.message }));
        }
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
      const activeCaptains = await getAllActiveCaptainsFromRedis();
      activeCaptains.forEach((captain) => {
        if (captain.vehicle.vehicleType === trip.type && captain.status === 'active') {
          const client = clients.get(captain.id.toString());
          if (client?.ws.readyState === WebSocket.OPEN) {
            client.ws.send(message);
            captainsNotified.push(captain.id);
          }
        }
      });

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
            logger.warn(`Removed expired subscription: ${sub.endpoint}`);
          }
        }
      }

      const userClient = clients.get(user._id.toString());
      if (userClient?.ws.readyState === WebSocket.OPEN) {
        userClient.ws.send(JSON.stringify({ type: 'trip_request_sent', data: { tripId: trip._id } }));
      }
    } catch (error) {
      logger.error('Error creating trip', { error: error.message });
      const userClient = clients.get(user._id.toString());
      if (userClient?.ws.readyState === WebSocket.OPEN) {
        userClient.ws.send(JSON.stringify({ type: 'trip_request_failed', message: 'Server error creating trip' }));
      }
    }
  }

  async function handleTripResponse(captain, data) {
    try {
      const { error } = tripResponseSchema.validate(data);
      if (error) {
        const captainClient = clients.get(captain._id.toString());
        if (captainClient?.ws.readyState === WebSocket.OPEN) {
          captainClient.ws.send(JSON.stringify({ type: 'trip_response_failed', message: error.message }));
        }
        return;
      }

      const { tripId, action, amount } = data;
      const trip = await Trip.findById(tripId);
      if (!trip) {
        const captainClient = clients.get(captain._id.toString());
        if (captainClient?.ws.readyState === WebSocket.OPEN) {
          captainClient.ws.send(JSON.stringify({ type: 'trip_response_failed', message: 'Trip not found' }));
        }
        return;
      }

      if (trip.status !== 'pending') {
        const captainClient = clients.get(captain._id.toString());
        if (captainClient?.ws.readyState === WebSocket.OPEN) {
          captainClient.ws.send(JSON.stringify({ type: 'trip_already_handled', message: 'This trip has already been handled' }));
        }
        return;
      }

      if (action === 'accept') {
        trip.captainId = captain._id;
        trip.status = 'accepted';
        trip.finalAmount = amount || trip.proposedAmount;
        trip.acceptedAt = new Date();
        await trip.save();

        const userClient = clients.get(trip.userId.toString());
        if (userClient?.ws.readyState === WebSocket.OPEN) {
          userClient.ws.send(
            JSON.stringify({
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
            })
          );
        }

        const userSubscription = await Subscription.findOne({ userId: trip.userId });
        if (userSubscription) {
          const payload = JSON.stringify({
            title: 'Trip Accepted',
            body: `Captain ${captain.fullname.firstname} accepted your trip for $${trip.finalAmount}`,
          });
          try {
            await webpush.sendNotification(userSubscription, payload);
cri
        } catch (err) {
          if (err.statusCode === 410) {
            await Subscription.deleteOne({ endpoint: userSubscription.endpoint });
            logger.warn(`Removed expired subscription: ${userSubscription.endpoint}`);
          }
        }
      }

      const activeCaptains = await getAllActiveCaptainsFromRedis();
      activeCaptains.forEach((c) => {
        if (c.id.toString() !== captain._id.toString()) {
          const client = clients.get(c.id.toString());
          if (client?.ws.readyState === WebSocket.OPEN) {
            client.ws.send(
              JSON.stringify({
                type: 'trip_taken',
                data: { tripId: trip._id },
              })
            );
          }
        }
      });
    } else if (action === 'reject') {
      const userClient = clients.get(trip.userId.toString());
      if (userClient?.ws.readyState === WebSocket.OPEN) {
        userClient.ws.send(
          JSON.stringify({
            type: 'captain_rejected_trip',
            data: { tripId: trip._id, captainId: captain._id },
          })
        );
      }

      const userSubscription = await Subscription.findOne({ userId: trip.userId });
      if (userSubscription) {
        const payload = JSON.stringify({
          title: 'Trip Rejected',
          body: `A captain rejected your trip request. Finding another captain...`,
        });
        try {
          await webpush.sendNotification(userSubscription, payload);
        } catch (err) {
          if (err.statusCode === 410) {
            await Subscription.deleteOne({ endpoint: userSubscription.endpoint });
            logger.warn(`Removed expired subscription: ${userSubscription.endpoint}`);
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error handling trip response', { error: error.message });
    const captainClient = clients.get(captain._id.toString());
    if (captainClient?.ws.readyState === WebSocket.OPEN) {
      captainClient.ws.send(JSON.stringify({ type: 'trip_response_failed', message: 'Server error processing response' }));
    }
  }
}

async function handleTripStatusUpdate(user, data) {
  try {
    const { error } = tripStatusSchema.validate(data);
    if (error) {
      const senderClient = clients.get(user._id.toString());
      if (senderClient?.ws.readyState === WebSocket.OPEN) {
        senderClient.ws.send(JSON.stringify({ type: 'trip_status_update_failed', message: error.message }));
      }
      return;
    }

    const { tripId, status } = data;
    const trip = await Trip.findById(tripId);
    if (!trip) {
      const senderClient = clients.get(user._id.toString());
      if (senderClient?.ws.readyState === WebSocket.OPEN) {
        senderClient.ws.send(JSON.stringify({ type: 'trip_status_update_failed', message: 'Trip not found' }));
      }
      return;
    }

    if (
      trip.userId.toString() !== user._id.toString() &&
      trip.captainId?.toString() !== user._id.toString()
    ) {
      const senderClient = clients.get(user._id.toString());
      if (senderClient?.ws.readyState === WebSocket.OPEN) {
        senderClient.ws.send(JSON.stringify({ type: 'trip_status_update_failed', message: 'Unauthorized action' }));
      }
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
      const senderClient = clients.get(user._id.toString());
      if (senderClient?.ws.readyState === WebSocket.OPEN) {
        senderClient.ws.send(JSON.stringify({ type: 'trip_status_update_failed', message: `Cannot transition from ${trip.status} to ${status}` }));
      }
      return;
    }

    trip.status = status;
    if (status === 'completed') trip.completedAt = new Date();
    await trip.save();

    const message = JSON.stringify({
      type: 'trip_status_update',
      data: { tripId: trip._id.toString(), status },
    });

    const userClient = clients.get(trip.userId.toString());
    const captainClient = trip.captainId ? clients.get(trip.captainId.toString()) : null;

    if (userClient?.ws.readyState === WebSocket.OPEN) {
      userClient.ws.send(message);
    }
    if (captainClient?.ws.readyState === WebSocket.OPEN) {
      captainClient.ws.send(message);
    }

    const subscriptions = await Subscription.find({ userId: { $in: [trip.userId, trip.captainId].filter(Boolean) } });
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
          logger.warn(`Removed expired subscription: ${sub.endpoint}`);
        }
      }
    }
  } catch (error) {
    logger.error('Error updating trip status', { error: error.message });
    const senderClient = clients.get(user._id.toString());
    if (senderClient?.ws.readyState === WebSocket.OPEN) {
      senderClient.ws.send(JSON.stringify({ type: 'trip_status_update_failed', message: 'Server error updating status' }));
    }
  }
}

async function handleChatMessage(sender, data) {
  try {
    const { error } = chatMessageSchema.validate(data);
    if (error) {
      const senderClient = clients.get(sender._id.toString());
      if (senderClient?.ws.readyState === WebSocket.OPEN) {
        senderClient.ws.send(JSON.stringify({ type: 'chat_error', message: error.message }));
      }
      return;
    }

    const { tripId, message } = data;
    const trip = await Trip.findById(tripId);
    if (!trip) {
      const senderClient = clients.get(sender._id.toString());
      if (senderClient?.ws.readyState === WebSocket.OPEN) {
        senderClient.ws.send(JSON.stringify({ type: 'chat_error', message: 'Trip not found' }));
      }
      return;
    }

    let receiverId = null;
    if (sender._id.toString() === trip.userId.toString()) {
      receiverId = trip.captainId;
    } else if (trip.captainId && sender._id.toString() === trip.captainId.toString()) {
      receiverId = trip.userId;
    } else {
      const senderClient = clients.get(sender._id.toString());
      if (senderClient?.ws.readyState === WebSocket.OPEN) {
        senderClient.ws.send(JSON.stringify({ type: 'chat_error', message: 'You are not authorized for this chat' }));
      }
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

    const clientMsg = {
      type: 'chat_message',
      data: {
        tripId: tripId.toString(),
        message: {
          id: msgObj._id.toString(),
          sender: sender.fullname.firstname || 'You',
          text: msgObj.text,
          timestamp: msgObj.timestamp,
        },
      },
    };

    if (receiverId) {
      const receiverClient = clients.get(receiverId.toString());
      if (receiverClient?.ws.readyState === WebSocket.OPEN) {
        const receiverClientMsg = {
          ...clientMsg,
          data: {
            ...clientMsg.data,
            message: {
              ...clientMsg.data.message,
              sender: sender.fullname.firstname || 'Other User',
            },
          },
        };
        receiverClient.ws.send(JSON.stringify(receiverClientMsg));
      }

      const receiverSubscription = await Subscription.findOne({ userId: receiverId });
      if (receiverSubscription) {
        const payload = JSON.stringify({
          title: 'New Chat Message',
          body: `${sender.fullname.firstname}: ${msgObj.text}`,
        });
        try {
          await webpush.sendNotification(receiverSubscription, payload);
        } catch (err) {
          if (err.statusCode === 410) {
            await Subscription.deleteOne({ endpoint: receiverSubscription.endpoint });
            logger.warn(`Removed expired subscription: ${receiverSubscription.endpoint}`);
          }
        }
      }
    }

    const senderClient = clients.get(sender._id.toString());
    if (senderClient?.ws.readyState === WebSocket.OPEN) {
      senderClient.ws.send(JSON.stringify(clientMsg));
    }
  } catch (error) {
    logger.error('Error sending chat message', { error: error.message });
    const senderClient = clients.get(sender._id.toString());
    if (senderClient?.ws.readyState === WebSocket.OPEN) {
      senderClient.ws.send(JSON.stringify({ type: 'chat_error', message: 'Server error sending message' }));
    }
  }
}

async function handleStatusUpdate(user, data) {
  try {
    const { error } = statusUpdateSchema.validate(data);
    if (error) {
      const senderClient = clients.get(user._id.toString());
      if (senderClient?.ws.readyState === WebSocket.OPEN) {
        senderClient.ws.send(JSON.stringify({ type: 'error', message: error.message }));
      }
      return;
    }

    const { status } = data;
    await Captain.findByIdAndUpdate(user._id, { status });
    const captainData = {
      id: user._id.toString(),
      location: user.location || null,
      vehicle: user.vehicle,
      status,
    };
    await updateActiveCaptainsInRedis(user._id.toString(), captainData);
    broadcastActiveCaptains();
  } catch (error) {
    logger.error('Error updating status', { error: error.message });
    const senderClient = clients.get(user._id.toString());
    if (senderClient?.ws.readyState === WebSocket.OPEN) {
      senderClient.ws.send(JSON.stringify({ type: 'error', message: 'Failed to update status' }));
    }
  }
}

function isValidLocation(location) {
  const { error } = locationSchema.validate(location);
  return !error;
}
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM. Performing graceful shutdown');
  await redisPublisher.quit();
  await redisSubscriber.quit();
  logger.info('Redis clients shut down');
  process.exit(0);
});

module.exports = { initWebSocket, clients };
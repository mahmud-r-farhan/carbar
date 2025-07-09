const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { cleanEnv, str } = require('envalid');
const Captain = require('../models/captain.model');
const User = require('../models/user.model');
const Trip = require('../models/trip.model');
const logger = require('../config/logger');

const env = cleanEnv(process.env, {
  JWT_SECRET: str(),
  WS_BASE_URL: str({ default: 'ws://localhost' }),
});

const clients = new Map();
const activeCaptains = new Map();

// WebSocket close codes
const WS_CLOSE_CODES = {
  AUTH_REQUIRED: 1008,
  INVALID_USER: 1008,
  AUTH_FAILED: 1008,
};

/**
 * Initializes WebSocket server
 * @param {http.Server} server - HTTP server instance
 */
function initWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', async (ws, req) => {
    try {
      const url = new URL(req.url, env.WS_BASE_URL);
      const token = url.searchParams.get('token');
      if (!token) {
        ws.close(WS_CLOSE_CODES.AUTH_REQUIRED, 'Authentication required');
        return;
      }

      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = (await User.findById(decoded._id)) || (await Captain.findById(decoded._id));
      if (!user) {
        ws.close(WS_CLOSE_CODES.INVALID_USER, 'Invalid user');
        return;
      }

      clients.set(user._id.toString(), { ws, user });

      if (user.vehicle) {
        activeCaptains.set(user._id.toString(), {
          id: user._id,
          location: user.location || null,
          vehicle: user.vehicle,
          status: 'active',
        });
        broadcastActiveCaptains();
      }

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data);
          switch (message.type) {
            case 'location_update':
              await handleLocationUpdate(user, message.data);
              break;
            case 'trip_request':
              await handleTripRequest(user, message.data);
              break;
            case 'trip_response':
              await handleTripResponse(user, message.data);
              break;
            case 'message':
              await handleChatMessage(user, message.data);
              break;
          }
        } catch (err) {
          logger.error('Message handling error:', { error: err.message });
        }
      });

      ws.on('close', () => {
        clients.delete(user._id.toString());
        if (user.vehicle) {
          activeCaptains.delete(user._id.toString());
          broadcastActiveCaptains();
        }
      });
    } catch (err) {
      logger.error('WebSocket connection error:', { error: err.message });
      ws.close(WS_CLOSE_CODES.AUTH_FAILED, 'Authentication failed');
    }
  });

  /**
   * Broadcasts the list of active captains to connected clients
   */
  function broadcastActiveCaptains() {
    const captainsList = Array.from(activeCaptains.values());
    const message = JSON.stringify({
      type: 'active_captains',
      data: captainsList,
    });

    clients.forEach(({ ws, user }) => {
      if (!user.vehicle && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * Handles captain location updates
   * @param {Object} user - The captain user object
   * @param {Object} location - The updated location data
   */
  async function handleLocationUpdate(user, location) {
    if (!user.vehicle) return;
    await Captain.findByIdAndUpdate(user._id, { location });
    activeCaptains.get(user._id.toString()).location = location;
    broadcastActiveCaptains();
  }

  /**
   * Handles trip requests from users
   * @param {Object} user - The user requesting the trip
   * @param {Object} tripData - The trip request data
   */
  async function handleTripRequest(user, tripData) {
    const trip = await Trip.create({
      userId: user._id,
      ...tripData,
    });

    const message = JSON.stringify({
      type: 'new_trip_request',
      data: trip,
    });

    activeCaptains.forEach((captain) => {
      const client = clients.get(captain.id.toString());
      if (client?.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  /**
   * Handles trip responses from captains
   * @param {Object} captain - The captain responding to the trip
   * @param {Object} data - The trip response data (tripId, action, amount)
   */
  async function handleTripResponse(captain, { tripId, action, amount }) {
    const trip = await Trip.findById(tripId);
    if (!trip) return;

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
            data: trip,
          })
        );
      }
      // Optionally, notify all captains that trip is accepted
      activeCaptains.forEach((c) => {
        const client = clients.get(c.id.toString());
        if (client?.ws.readyState === WebSocket.OPEN) {
          client.ws.send(
            JSON.stringify({
              type: 'trip_accepted',
              data: trip,
            })
          );
        }
      });
    }
  }

  /**
   * Handles chat messages between users and captains
   * @param {Object} user - The user sending the message
   * @param {Object} data - The chat message data (tripId, message)
   */
  async function handleChatMessage(user, { tripId, message }) {
    const trip = await Trip.findById(tripId);
    if (!trip) return;

    const msgObj = {
      sender: user._id,
      text: message,
      timestamp: new Date(),
    };
    trip.messages.push(msgObj);
    await trip.save();

    // Send to the other party (user or captain)
    const otherId = user.vehicle ? trip.userId : trip.captainId;
    const otherClient = clients.get(otherId?.toString());
    if (otherClient?.ws.readyState === WebSocket.OPEN) {
      otherClient.ws.send(
        JSON.stringify({
          type: 'chat_message',
          data: {
            tripId,
            message: msgObj,
          },
        })
      );
    }
    // Also echo back to sender for confirmation
    const senderClient = clients.get(user._id.toString());
    if (senderClient?.ws.readyState === WebSocket.OPEN) {
      senderClient.ws.send(
        JSON.stringify({
          type: 'chat_message',
          data: {
            tripId,
            message: msgObj,
          },
        })
      );
    }
  }
}

module.exports = initWebSocket;
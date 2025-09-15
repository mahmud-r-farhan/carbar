const logger = require('../config/logger');
const Joi = require('joi');
const { handleLocationUpdate, handleStatusUpdate } = require('./websocket.captainHandler');
const { handleTripRequest, handleTripResponse, handleTripStatusUpdate, handleChatMessage } = require('./websocket.tripHandler');

function validateMessage(messageData) {
  try {
    const message = JSON.parse(messageData);
    if (!message.type || !message.data) {
      return { valid: false, error: 'Invalid message format' };
    }
    return { valid: true, message };
  } catch (parseErr) {
    return { valid: false, error: 'Invalid JSON format' };
  }
}

async function handleMessage(messageData, userId, userRole, ws, clients, redisClient) {
  try {
    const { valid, message, error } = validateMessage(messageData);

    if (!valid) {
      logger.warn('Invalid message format', { userId, messageData: messageData.toString(), timestamp: new Date() });
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', message: error }));
      }
      return;
    }

    switch (message.type) {
      case 'location_update':
        if (userRole === 'captain') {
          const user = clients.get(userId)?.user;
          if (user) await handleLocationUpdate(user, message.data, redisClient);
        } else {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized action' }));
          }
        }
        break;
      case 'trip_request':
        if (userRole === 'user') {
          const user = clients.get(userId)?.user;
          if (user) await handleTripRequest(user, message.data, clients, redisClient);
        } else {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized action' }));
          }
        }
        break;
      case 'trip_response':
        if (userRole === 'captain') {
          const captain = clients.get(userId)?.user;
          if (captain) await handleTripResponse(captain, message.data, clients, redisClient);
        } else {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized action' }));
          }
        }
        break;
      case 'trip_status_update':
        const user = clients.get(userId)?.user;
        if (user) await handleTripStatusUpdate(user, message.data, clients, redisClient);
        break;
      case 'chat_message':
        const sender = clients.get(userId)?.user;
        if (sender) await handleChatMessage(sender, message.data, clients, redisClient);
        break;
      case 'status_update':
        if (userRole === 'captain') {
          const user = clients.get(userId)?.user;
          if (user) await handleStatusUpdate(user, message.data, redisClient);
        } else {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized action' }));
          }
        }
        break;
      default:
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${message.type}` }));
        }
    }
  } catch (err) {
    logger.error(`Error handling message from user ${userId}`, { error: err.message, timestamp: new Date() });
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'error', message: 'Server error processing your message' }));
    }
  }
}

module.exports = { handleMessage, validateMessage };
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const env = require('../config/env');

async function handleConnection(ws, req, redisClient, clients) {
  try {
    // Extract token from query params or headers
    const token = req.url?.split('token=')[1] || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      logger.warn('WebSocket connection rejected: No token provided', { 
        ip: req.socket.remoteAddress,
        timestamp: new Date() 
      });
      ws.close(1008, 'Token required');
      return;
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (error) {
      logger.warn('WebSocket connection rejected: Invalid token', { 
        error: error.message,
        ip: req.socket.remoteAddress,
        timestamp: new Date() 
      });
      ws.close(1008, 'Invalid token');
      return;
    }

    const userId = decoded.id || decoded._id || decoded.userId;
    
    if (!userId) {
      logger.warn('WebSocket connection rejected: No user ID in token', { 
        ip: req.socket.remoteAddress,
        timestamp: new Date() 
      });
      ws.close(1008, 'Invalid token payload');
      return;
    }

    // Check if user is already connected
    const existingClient = clients.get(userId);
    if (existingClient && existingClient.ws.readyState === WebSocket.OPEN) {
      logger.info(`Closing existing connection for user ${userId}`, { timestamp: new Date() });
      existingClient.ws.close(1000, 'New connection established');
    }

    // Store client connection
    clients.set(userId, {
      ws,
      userId,
      connectedAt: new Date(),
      lastSeen: new Date(),
      userType: decoded.userType || 'user' // Could be 'user' or 'captain'
    });

    ws.isAlive = true;
    ws.userId = userId;

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection_established',
      message: 'WebSocket connection established',
      userId,
      timestamp: new Date().toISOString()
    }));

    logger.info(`WebSocket client connected: ${userId}`, { 
      totalClients: clients.size,
      userType: decoded.userType,
      timestamp: new Date() 
    });

    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(ws, message, redisClient, clients);
      } catch (error) {
        logger.error(`Error handling message from user ${userId}`, { 
          error: error.message,
          timestamp: new Date() 
        });
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });

    // Handle connection close
    ws.on('close', (code, reason) => {
      clients.delete(userId);
      logger.info(`WebSocket client disconnected: ${userId}`, { 
        code,
        reason: reason.toString(),
        totalClients: clients.size,
        timestamp: new Date() 
      });
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`WebSocket error for user ${userId}`, { 
        error: error.message,
        timestamp: new Date() 
      });
      clients.delete(userId);
    });

    // Handle ping/pong for keepalive
    ws.on('pong', () => {
      ws.isAlive = true;
      const client = clients.get(userId);
      if (client) {
        client.lastSeen = new Date();
      }
    });

  } catch (error) {
    logger.error('Error in WebSocket connection handler', { 
      error: error.message,
      stack: error.stack,
      timestamp: new Date() 
    });
    ws.close(1011, 'Server error');
  }
}

async function handleMessage(ws, message, redisClient, clients) {
  const { type, data } = message;
  const userId = ws.userId;

  logger.debug(`Received message from ${userId}`, { type, timestamp: new Date() });

  switch (type) {
    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
      }));
      break;

    case 'location_update':
      // Handle location updates for captains
      if (data.lat && data.lng) {
        await handleLocationUpdate(userId, data, redisClient);
        ws.send(JSON.stringify({
          type: 'location_update_ack',
          timestamp: new Date().toISOString()
        }));
      }
      break;

    case 'trip_status_update':
      // Handle trip status updates
      await handleTripStatusUpdate(userId, data, redisClient, clients);
      break;

    case 'join_room':
      // Handle room joining (for trip-specific communications)
      await handleJoinRoom(ws, data.roomId, clients);
      break;

    case 'leave_room':
      // Handle room leaving
      await handleLeaveRoom(ws, data.roomId, clients);
      break;

    default:
      logger.warn(`Unknown message type: ${type} from user ${userId}`, { timestamp: new Date() });
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${type}`,
        timestamp: new Date().toISOString()
      }));
  }
}

async function handleLocationUpdate(userId, locationData, redisClient) {
  try {
    // Store location in Redis with expiration
    const locationKey = `captain_location:${userId}`;
    await redisClient.setEx(locationKey, 300, JSON.stringify({
      ...locationData,
      timestamp: new Date().toISOString()
    })); // Expire after 5 minutes

    logger.debug(`Location updated for captain ${userId}`, { 
      lat: locationData.lat,
      lng: locationData.lng,
      timestamp: new Date() 
    });
  } catch (error) {
    logger.error(`Failed to store location for captain ${userId}`, { 
      error: error.message,
      timestamp: new Date() 
    });
  }
}

async function handleTripStatusUpdate(userId, statusData, redisClient, clients) {
  try {
    // Broadcast trip status to relevant users
    const { tripId, status, message } = statusData;
    
    // Store in Redis for persistence
    await redisClient.publish('trip_updates', JSON.stringify({
      tripId,
      captainId: userId,
      status,
      message,
      timestamp: new Date().toISOString()
    }));

    logger.info(`Trip status updated by ${userId}`, { 
      tripId,
      status,
      timestamp: new Date() 
    });
  } catch (error) {
    logger.error(`Failed to handle trip status update from ${userId}`, { 
      error: error.message,
      timestamp: new Date() 
    });
  }
}

async function handleJoinRoom(ws, roomId, clients) {
  // Add room functionality if needed
  if (!ws.rooms) {
    ws.rooms = new Set();
  }
  ws.rooms.add(roomId);
  
  logger.debug(`User ${ws.userId} joined room ${roomId}`, { timestamp: new Date() });
}

async function handleLeaveRoom(ws, roomId, clients) {
  // Remove room functionality if needed
  if (ws.rooms) {
    ws.rooms.delete(roomId);
  }
  
  logger.debug(`User ${ws.userId} left room ${roomId}`, { timestamp: new Date() });
}

module.exports = {
  handleConnection
};
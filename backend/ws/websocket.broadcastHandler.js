const WebSocket = require('ws');
const logger = require('../config/logger');

/**
 * Broadcast message received from Redis to connected clients
 */
function broadcastFromRedis(data, clients) {
  try {
    const { type, targetUserId, targetUserIds, roomId, message, excludeUserId } = data;

    logger.debug('Broadcasting message from Redis', { 
      type, 
      targetUserId, 
      targetUserIds: targetUserIds?.length,
      roomId,
      timestamp: new Date() 
    });

    switch (type) {
      case 'user_message':
        if (targetUserId) {
          sendToUser(targetUserId, message, clients);
        }
        break;

      case 'bulk_message':
        if (targetUserIds && Array.isArray(targetUserIds)) {
          sendToMultipleUsers(targetUserIds, message, clients, excludeUserId);
        }
        break;

      case 'room_message':
        if (roomId) {
          sendToRoom(roomId, message, clients, excludeUserId);
        }
        break;

      case 'broadcast_all':
        sendToAllUsers(message, clients, excludeUserId);
        break;

      case 'captain_notification':
        sendToCaptains(message, clients);
        break;

      case 'user_notification':
        sendToUsers(message, clients);
        break;

      case 'trip_update':
        handleTripUpdate(data, clients);
        break;

      default:
        logger.warn(`Unknown broadcast type: ${type}`, { timestamp: new Date() });
    }

  } catch (error) {
    logger.error('Error in broadcastFromRedis', { 
      error: error.message,
      data: JSON.stringify(data),
      timestamp: new Date() 
    });
  }
}

/**
 * Send message to a specific user
 */
function sendToUser(userId, message, clients) {
  const client = clients.get(userId);
  
  if (client && client.ws && client.ws.readyState === WebSocket.OPEN) {
    try {
      client.ws.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      }));
      
      logger.debug(`Message sent to user ${userId}`, { 
        messageType: message.type,
        timestamp: new Date() 
      });
      return true;
    } catch (error) {
      logger.error(`Failed to send message to user ${userId}`, { 
        error: error.message,
        timestamp: new Date() 
      });
      // Remove stale connection
      clients.delete(userId);
      return false;
    }
  } else {
    logger.debug(`User ${userId} not connected or connection not open`, { timestamp: new Date() });
    return false;
  }
}

/**
 * Send message to multiple specific users
 */
function sendToMultipleUsers(userIds, message, clients, excludeUserId = null) {
  let sentCount = 0;
  
  userIds.forEach(userId => {
    if (userId !== excludeUserId) {
      if (sendToUser(userId, message, clients)) {
        sentCount++;
      }
    }
  });
  
  logger.debug(`Bulk message sent to ${sentCount}/${userIds.length} users`, { 
    messageType: message.type,
    timestamp: new Date() 
  });
  
  return sentCount;
}

/**
 * Send message to all users in a room
 */
function sendToRoom(roomId, message, clients, excludeUserId = null) {
  let sentCount = 0;
  
  clients.forEach((client, userId) => {
    if (userId !== excludeUserId && 
        client.ws && 
        client.ws.readyState === WebSocket.OPEN &&
        client.ws.rooms && 
        client.ws.rooms.has(roomId)) {
      
      if (sendToUser(userId, message, clients)) {
        sentCount++;
      }
    }
  });
  
  logger.debug(`Room message sent to ${sentCount} users in room ${roomId}`, { 
    messageType: message.type,
    timestamp: new Date() 
  });
  
  return sentCount;
}

/**
 * Send message to all connected users
 */
function sendToAllUsers(message, clients, excludeUserId = null) {
  let sentCount = 0;
  
  clients.forEach((client, userId) => {
    if (userId !== excludeUserId) {
      if (sendToUser(userId, message, clients)) {
        sentCount++;
      }
    }
  });
  
  logger.info(`Broadcast message sent to ${sentCount}/${clients.size} connected users`, { 
    messageType: message.type,
    timestamp: new Date() 
  });
  
  return sentCount;
}

/**
 * Send message only to captains
 */
function sendToCaptains(message, clients) {
  let sentCount = 0;
  
  clients.forEach((client, userId) => {
    if (client.userType === 'captain') {
      if (sendToUser(userId, message, clients)) {
        sentCount++;
      }
    }
  });
  
  logger.debug(`Captain notification sent to ${sentCount} captains`, { 
    messageType: message.type,
    timestamp: new Date() 
  });
  
  return sentCount;
}

/**
 * Send message only to regular users (not captains)
 */
function sendToUsers(message, clients) {
  let sentCount = 0;
  
  clients.forEach((client, userId) => {
    if (client.userType !== 'captain') {
      if (sendToUser(userId, message, clients)) {
        sentCount++;
      }
    }
  });
  
  logger.debug(`User notification sent to ${sentCount} users`, { 
    messageType: message.type,
    timestamp: new Date() 
  });
  
  return sentCount;
}

/**
 * Handle trip-specific updates
 */
function handleTripUpdate(data, clients) {
  const { tripId, captainId, userId, status, message } = data;
  
  // Send to trip participants
  const tripMessage = {
    type: 'trip_update',
    tripId,
    captainId,
    status,
    message,
    timestamp: new Date().toISOString()
  };
  
  // Send to captain
  if (captainId) {
    sendToUser(captainId, tripMessage, clients);
  }
  
  // Send to user
  if (userId && userId !== captainId) {
    sendToUser(userId, tripMessage, clients);
  }
  
  logger.info(`Trip update sent for trip ${tripId}`, { 
    status,
    captainId,
    userId,
    timestamp: new Date() 
  });
}

/**
 * Get statistics about message delivery
 */
function getBroadcastStats(clients) {
  const stats = {
    totalClients: clients.size,
    connectedClients: 0,
    captains: 0,
    users: 0,
    roomCounts: {}
  };
  
  clients.forEach((client, userId) => {
    if (client.ws && client.ws.readyState === WebSocket.OPEN) {
      stats.connectedClients++;
      
      if (client.userType === 'captain') {
        stats.captains++;
      } else {
        stats.users++;
      }
      
      // Count rooms
      if (client.ws.rooms) {
        client.ws.rooms.forEach(room => {
          stats.roomCounts[room] = (stats.roomCounts[room] || 0) + 1;
        });
      }
    }
  });
  
  return stats;
}

module.exports = {
  broadcastFromRedis,
  sendToUser,
  sendToMultipleUsers,
  sendToRoom,
  sendToAllUsers,
  sendToCaptains,
  sendToUsers,
  handleTripUpdate,
  getBroadcastStats
};
const WebSocket = require('ws');
const logger = require('../config/logger');
const { handleConnection } = require('./websocket.connectionHandler');
const { broadcastFromRedis } = require('./websocket.broadcastHandler');

// In-memory client tracking
const clients = new Map();

let wssInstance = null;
let redisClientInstance = null; // Store redis client instance

async function initWebSocket(server, redisClient) {
  try {
    // Store the redis client for module scope
    redisClientInstance = redisClient;
    
    // Subscribe to Redis broadcast channel
    await redisClient.subscribe('broadcast', (message) => {
      try {
        const data = JSON.parse(message);
        broadcastFromRedis(data, clients); // Pass clients map
        logger.debug('Broadcast message processed', { messageType: typeof data, timestamp: new Date() });
      } catch (err) {
        logger.error('Error parsing Redis message', { error: err.message, message, timestamp: new Date() });
      }
    });

    const wss = new WebSocket.Server({ 
      server, 
      path: process.env.WS_PATH || '/ws' 
    });
    wssInstance = wss; // Store instance

    wss.on('connection', async (ws, req) => {
      try {
        await handleConnection(ws, req, redisClient, clients);
      } catch (err) {
        logger.error('Error handling WebSocket connection', { error: err.message, timestamp: new Date() });
        ws.terminate();
      }
    });

    // Heartbeat mechanism
    const heartbeatInterval = setInterval(() => {
      wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          if (!ws.isAlive) {
            logger.warn('Terminating stale WebSocket connection', { 
              remoteAddress: ws._socket?.remoteAddress, 
              timestamp: new Date() 
            });
            return ws.terminate();
          }
          ws.isAlive = false;
          ws.ping(() => {
            // Ping callback - connection is alive
          });
        }
      });
    }, 30000); // 30 seconds

    // Handle pong responses
    wss.on('connection', (ws) => {
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });
    });

    // Periodic cleanup of stale clients
    const cleanupInterval = setInterval(() => {
      for (const [userId, clientData] of clients) {
        if (clientData?.ws?.readyState !== WebSocket.OPEN) {
          clients.delete(userId);
          logger.info(`Cleaned up stale client: ${userId}`, { timestamp: new Date() });
        }
      }
    }, 60000); // Every 60 seconds

    wss.on('close', () => {
      clearInterval(heartbeatInterval);
      clearInterval(cleanupInterval);
      logger.info('WebSocket server closed', { timestamp: new Date() });
    });

    logger.info(`WebSocket server initialized on path: ${process.env.WS_PATH || '/ws'}`, { 
      clientCount: 0,
      timestamp: new Date() 
    });

  } catch (error) {
    logger.error('Failed to initialize WebSocket server', { 
      error: error.message, 
      stack: error.stack,
      timestamp: new Date() 
    });
    throw error;
  }
}

// Graceful shutdown helper
async function shutdownWebsocket() {
  return new Promise((resolve) => {
    if (wssInstance) {
      // Close all client connections
      wssInstance.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Server shutting down');
        }
      });

      wssInstance.close(() => {
        logger.info('WebSocket server shut down gracefully', { timestamp: new Date() });
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Function to get redis client (if needed by other modules)
function getRedisClient() {
  return redisClientInstance;
}

// Function to broadcast message to specific user
function broadcastToUser(userId, message) {
  const client = clients.get(userId);
  if (client && client.ws && client.ws.readyState === WebSocket.OPEN) {
    try {
      client.ws.send(JSON.stringify(message));
      logger.debug(`Message sent to user ${userId}`, { messageType: message.type, timestamp: new Date() });
      return true;
    } catch (error) {
      logger.error(`Failed to send message to user ${userId}`, { error: error.message, timestamp: new Date() });
      return false;
    }
  }
  return false;
}

// Function to broadcast message to all connected clients
function broadcastToAll(message) {
  let sentCount = 0;
  clients.forEach((clientData, userId) => {
    if (broadcastToUser(userId, message)) {
      sentCount++;
    }
  });
  logger.info(`Broadcast message sent to ${sentCount} clients`, { 
    totalClients: clients.size,
    messageType: message.type,
    timestamp: new Date() 
  });
  return sentCount;
}

// Function to get connected client count
function getClientCount() {
  return clients.size;
}

// Function to get connected client info (for debugging)
function getClientInfo() {
  const clientInfo = [];
  clients.forEach((clientData, userId) => {
    clientInfo.push({
      userId,
      connected: clientData.ws?.readyState === WebSocket.OPEN,
      connectedAt: clientData.connectedAt
    });
  });
  return clientInfo;
}

module.exports = {
  initWebSocket,
  shutdownWebsocket,
  clients,
  getRedisClient,
  broadcastToUser,
  broadcastToAll,
  getClientCount,
  getClientInfo
};
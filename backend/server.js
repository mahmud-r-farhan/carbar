const http = require('http');
const { app } = require('./app');
const { getRedisClient } = require('./config/redis');
const { initWebSocket, shutdownWebsocket } = require('./ws/websocket.service');
const { cleanEnv, num, str } = require('envalid');
const logger = require('./config/logger');

const env = cleanEnv(process.env, {
  PORT: num({ default: 3000, desc: 'Server port' }),
  WS_BASE_URL: str({ desc: 'WebSocket base URL' }),
});

const server = http.createServer(app);

async function startServer() {
  try {
    const redisClient = await getRedisClient();

    await new Promise((resolve, reject) => {
      if (redisClient && redisClient.isOpen) {
        resolve();
      } else {
        const checkInterval = setInterval(async () => {
          const client = await getRedisClient();
          if (client && client.isOpen) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 500);

        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Redis connection timeout'));
        }, 15000);
      }
    });

    await initWebSocket(server, redisClient);

    server.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        websocketPath: process.env.WS_PATH || '/ws',
        timestamp: new Date()
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date()
    });
    process.exit(1);
  }
}

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${env.PORT} is already in use`, { timestamp: new Date() });
  } else {
    logger.error('Server startup error:', { error: error.message, timestamp: new Date() });
  }
  process.exit(1);
});

// Graceful shutdown handlers
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.warn(`${signal} received again, forcing exit...`, { timestamp: new Date() });
    process.exit(1);
  }
  
  isShuttingDown = true;
  logger.info(`${signal} received. Starting graceful shutdown...`, { timestamp: new Date() });

  try {
    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed', { timestamp: new Date() });
      
      try {
        // Shutdown WebSocket server
        await shutdownWebsocket();
        
        // Close Redis connection (handled in app.js SIGTERM handler)
        logger.info('Graceful shutdown completed', { timestamp: new Date() });
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', { 
          error: error.message,
          timestamp: new Date() 
        });
        process.exit(1);
      }
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit', { timestamp: new Date() });
      process.exit(1);
    }, 10000);

  } catch (error) {
    logger.error('Error initiating graceful shutdown:', { 
      error: error.message,
      timestamp: new Date() 
    });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { 
    error: error.message, 
    stack: error.stack,
    timestamp: new Date() 
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { 
    reason: reason.toString(), 
    stack: reason.stack,
    timestamp: new Date() 
  });
  process.exit(1);
});

// Start the server
startServer();
require('dotenv').config();
const { createClient } = require('redis');
const logger = require('./logger');

let redisClient = null;

async function createRedisClient() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  try {
    const isUsingRedisUrl = !!process.env.REDIS_URL;

    const baseConfig = {
      // Top-level options
      connectTimeout: 30000,
      // Retry strategy (compatible with redis >= 4.x)
      retryStrategy: (times) => {
        if (times > 10) {
          logger.error('Max Redis reconnection attempts reached', {
            attempts: times,
            timestamp: new Date()
          });
          return null;
        }
        const delay = Math.min(times * 500, 5000);
        logger.info(`Retrying Redis connection, attempt ${times}, delay ${delay}ms`, {
          timestamp: new Date()
        });
        return delay;
      },
    };

    const socketTlsOptions = process.env.REDIS_TLS === 'true' ? {
      rejectUnauthorized: false, // Bypass cert validation if TLS is on
      checkServerIdentity: () => undefined, // Skip hostname check if TLS is on
    } : {};

   const socketConfig = {
      ...(process.env.REDIS_TLS === 'true' ? { tls: true } : {}),
      ...socketTlsOptions,
      keepAliveInitialDelayMillis: 5000,
    };

    const redisConfig = isUsingRedisUrl
      ? {
          ...baseConfig,
          url: process.env.REDIS_URL,
          socket: socketConfig,
        }
      : {
          ...baseConfig,
          username: process.env.REDIS_USERNAME,
          password: process.env.REDIS_PASSWORD,
          socket: {
            ...socketConfig,
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
          },
        };

    redisClient = createClient(redisConfig);

    // Redis Event Listeners
    redisClient.on('error', (err) => {
      logger.error('Redis client error', {
        error: err.message,
        code: err.code,
        stack: err.stack,
        timestamp: new Date()
      });
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connecting...', {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        timestamp: new Date()
      });
    });

    redisClient.on('ready', () => {
      logger.info('Redis client connected and ready', {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        timestamp: new Date()
      });
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis client reconnecting...', {
        timestamp: new Date()
      });
    });

    redisClient.on('end', () => {
      logger.warn('Redis client connection closed', {
        timestamp: new Date()
      });
    });

    await redisClient.connect();

    // Test connection
    const ping = await redisClient.ping();
    logger.info('Redis connection test successful', {
      ping,
      timestamp: new Date()
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to create Redis client', {
      error: error.message,
      code: error.code,
      stack: error.stack,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      timestamp: new Date()
    });
    throw error;
  }
}

async function getRedisClient() {
  if (!redisClient || !redisClient.isOpen) {
    return await createRedisClient();
  }
  return redisClient;
}

async function closeRedisConnection() {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed gracefully', {
        timestamp: new Date()
      });
    } catch (err) {
      logger.error('Error closing Redis connection', {
        error: err.message,
        timestamp: new Date()
      });

      try {
        await redisClient.disconnect();
      } catch (disconnectError) {
        logger.error('Error force closing Redis connection', {
          error: disconnectError.message,
          timestamp: new Date()
        });
      }
    } finally {
      redisClient = null;
    }
  }
}

async function checkRedisHealth() {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return { healthy: false, error: 'Client not connected' };
    }

    const start = Date.now();
    await redisClient.ping();
    const latency = Date.now() - start;

    return {
      healthy: true,
      latency: `${latency}ms`,
      connected: redisClient.isOpen
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

module.exports = {
  createRedisClient,
  getRedisClient,
  closeRedisConnection,
  checkRedisHealth
};
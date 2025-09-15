require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const sanitizeHtml = require('sanitize-html');
const webpush = require('web-push');
const { body, validationResult } = require('express-validator');
const compression = require('compression');
const morgan = require('morgan');

const connectToDb = require('./db/db.js');
const { configureVapid } = require('./config/vapid');
const { createRedisClient, closeRedisConnection, checkRedisHealth } = require('./config/redis');
const logger = require('./config/logger');
const env = require('./config/env');
const userRoutes = require('./routes/user.routes');
const captainRoutes = require('./routes/captain.routes');
const tripRoutes = require('./routes/trip.routes');
const swaggerRoutes = require('./docs/swagger');
const errorMiddleware = require('./middlewares/error.middleware');
const { auth } = require('./middlewares/auth.middleware');
const Subscription = require('./models/subscription.model');

const app = express();

// Initialize Redis client using the new configuration
let redisClient;

async function initializeRedis() {
  try {
    redisClient = await createRedisClient();
    
    // Periodic health check
    setInterval(async () => {
      try {
        const health = await checkRedisHealth();
        if (!health.healthy) {
          logger.warn('Redis health check failed', { 
            error: health.error,
            timestamp: new Date() 
          });
        } else {
          logger.debug('Redis health check passed', { 
            latency: health.latency,
            timestamp: new Date() 
          });
        }
      } catch (err) {
        logger.error('Redis health check error', { 
          error: err.message,
          timestamp: new Date() 
        });
      }
    }, 30000); // Every 30 seconds

    return redisClient;
  } catch (err) {
    logger.error('Failed to initialize Redis', { 
      error: err.message,
      stack: err.stack,
      timestamp: new Date() 
    });
    throw err;
  }
}

// Initialize Redis and setup rate limiter
let rateLimiter;

async function setupRateLimiter() {
  try {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }

    rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      points: env.RATE_LIMIT_MAX || 100, // Allow 100 requests by default
      duration: (env.RATE_LIMIT_WINDOW_MS || 900000) / 1000, // Convert to seconds
      keyPrefix: 'rate-limit',
      blockDuration: 300, // Block for 5 minutes if limit exceeded
      execEvenly: true, // Distribute requests evenly
    });

    logger.info('Rate limiter initialized with Redis', { 
      maxRequests: env.RATE_LIMIT_MAX || 100,
      windowMinutes: (env.RATE_LIMIT_WINDOW_MS || 900000) / 60000,
      timestamp: new Date() 
    });
  } catch (error) {
    logger.error('Failed to setup rate limiter', { 
      error: error.message,
      timestamp: new Date() 
    });
    throw error;
  }
}

// Connect to database and configure VAPID
connectToDb();
configureVapid();

// Security middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...env.ALLOWED_ORIGINS.split(','), env.WS_BASE_URL || 'ws://localhost:3000'],
    },
  },
}));
app.use(mongoSanitize());
app.use(compression());
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting middleware (commented out but ready to use)
/*
app.use(async (req, res, next) => {
  try {
    if (rateLimiter) {
      await rateLimiter.consume(req.ip);
    }
    next();
  } catch (err) {
    logger.warn('Rate limit exceeded', { 
      ip: req.ip, 
      userAgent: req.headers['user-agent'],
      timestamp: new Date() 
    });
    res.status(429).json({ 
      error: 'Too many requests, please try again later',
      retryAfter: Math.round(err.msBeforeNext / 1000) || 300 
    });
  }
});
*/

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = env.ALLOWED_ORIGINS.split(',');
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked', { origin, timestamp: new Date() });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Swagger API documentation
app.use(swaggerRoutes);

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'CarBar API',
    status: 'running',
    documentation: '/api-docs',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = require('mongoose').connection.readyState === 1;
    const redisHealth = await checkRedisHealth();
    
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          connected: dbConnected,
          status: dbConnected ? 'healthy' : 'disconnected'
        },
        redis: {
          connected: redisHealth.healthy,
          status: redisHealth.healthy ? 'healthy' : 'error',
          latency: redisHealth.latency || null,
          error: redisHealth.error || null
        },
        server: {
          status: 'healthy',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version
        }
      }
    };

    const allHealthy = dbConnected && redisHealth.healthy;
    res.status(allHealthy ? 200 : 503).json(healthStatus);
  } catch (err) {
    logger.error('Health check failed', { 
      error: err.message,
      timestamp: new Date() 
    });
    res.status(500).json({ 
      status: 'error', 
      error: 'Health check failed',
      timestamp: new Date().toISOString() 
    });
  }
});

app.get('/healthz', (req, res) => res.send('OK'));

app.get('/vapid-public-key', (req, res) => {
  logger.info('VAPID public key requested', { timestamp: new Date() });
  res.json({ publicKey: env.VAPID_PUBLIC_KEY });
});

app.post(
  '/subscribe',
  auth,
  [
    body('endpoint').notEmpty().withMessage('Endpoint is required'),
    body('keys.p256dh').notEmpty().withMessage('p256dh key is required'),
    body('keys.auth').notEmpty().withMessage('auth key is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Subscription validation failed', { 
          errors: errors.array(),
          userId: req.entity._id,
          timestamp: new Date() 
        });
        return res.status(400).json({ errors: errors.array() });
      }

      const subscription = {
        userId: req.entity._id,
        endpoint: sanitizeHtml(req.body.endpoint),
        keys: {
          p256dh: sanitizeHtml(req.body.keys.p256dh),
          auth: sanitizeHtml(req.body.keys.auth),
        },
      };

      await Subscription.findOneAndUpdate(
        { endpoint: subscription.endpoint },
        subscription,
        { upsert: true, new: true }
      );

      logger.info(`Subscription saved for user: ${req.entity._id}`, { timestamp: new Date() });
      res.status(201).json({ message: 'Subscription saved successfully' });
    } catch (error) {
      logger.error('Error saving subscription', { 
        error: error.message,
        userId: req.entity._id,
        timestamp: new Date() 
      });
      next(error);
    }
  }
);

app.post(
  '/send-notification',
  auth,
  [
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('body').notEmpty().withMessage('Body is required').trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Notification validation failed', { 
          errors: errors.array(),
          userId: req.entity._id,
          timestamp: new Date() 
        });
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, body } = req.body;
      const payload = JSON.stringify({
        title: sanitizeHtml(title),
        body: sanitizeHtml(body),
      });
      const results = [];

      const subscriptions = await Subscription.find({ userId: req.entity._id });
      
      if (subscriptions.length === 0) {
        return res.status(404).json({ message: 'No subscriptions found for user' });
      }

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
          results.push({ success: true, endpoint: sub.endpoint });
          logger.info(`Notification sent to ${sub.endpoint}`, { 
            userId: req.entity._id,
            timestamp: new Date() 
          });
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await Subscription.deleteOne({ endpoint: sub.endpoint });
            logger.warn(`Removed expired subscription: ${sub.endpoint}`, { 
              userId: req.entity._id,
              timestamp: new Date() 
            });
          }
          results.push({ success: false, endpoint: sub.endpoint, error: err.message });
          logger.error(`Failed to send notification to ${sub.endpoint}`, { 
            error: err.message,
            userId: req.entity._id,
            timestamp: new Date() 
          });
        }
      }

      res.json({ 
        message: 'Notification sending completed',
        results,
        total: subscriptions.length,
        successful: results.filter(r => r.success).length
      });
    } catch (error) {
      logger.error('Error sending notification', { 
        error: error.message,
        userId: req.entity._id,
        timestamp: new Date() 
      });
      next(error);
    }
  }
);

app.use('/user', userRoutes);
app.use('/captain', captainRoutes);
app.use('/trips', tripRoutes);

app.use(errorMiddleware);

// Initialize Redis before starting the server
let isShuttingDown = false;

async function initializeApp() {
  try {
    await initializeRedis();
    await setupRateLimiter();
    logger.info('Application initialized successfully', { timestamp: new Date() });
  } catch (error) {
    logger.error('Failed to initialize application', { 
      error: error.message,
      stack: error.stack,
      timestamp: new Date() 
    });
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.warn(`${signal} received again, forcing exit...`, { timestamp: new Date() });
    process.exit(1);
  }
  
  isShuttingDown = true;
  logger.info(`Received ${signal}. Performing graceful shutdown...`, { timestamp: new Date() });
  
  try {
    await closeRedisConnection();
    logger.info('Application shutdown completed', { timestamp: new Date() });
    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown', { 
      error: err.message,
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

// Initialize the application
initializeApp();

// Export app and redisClient for use in server.js
module.exports = { app, redisClient: () => redisClient };
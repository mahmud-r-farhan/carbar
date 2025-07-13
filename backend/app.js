require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const { createClient } = require('redis');
const sanitizeHtml = require('sanitize-html');
const webpush = require('web-push');
const { body, validationResult } = require('express-validator');
const compression = require('compression');
const morgan = require('morgan');

const connectToDb = require('./db/db.js');
const { configureVapid } = require('./config/vapid');
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

// Initialize Redis client
const redisClient = createClient({ url: env.REDIS_URL });
redisClient.on('error', (err) => logger.error('Redis client error', { error: err.message }));
redisClient.on('reconnecting', () => logger.info('Redis client reconnecting'));

async function connectRedis() {
  try {
    await redisClient.connect();
    logger.info('Redis client connected successfully');
  } catch (err) {
    logger.error('Failed to connect to Redis', { error: err.message });
    process.exit(1);
  }
}
connectRedis();

// Redis-based rate limiter
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: 100, // Allow 100 requests
  duration: 900, // Per 15 minutes (900 seconds)
  keyPrefix: 'rate-limit',
});

// Connect to database and configure VAPID
connectToDb();
configureVapid();

// Security middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...env.ALLOWED_ORIGINS.split(','), env.WS_BASE_URL],
    },
  },
}));
app.use(mongoSanitize());
app.use(compression());
app.use(morgan('combined', { stream: logger.stream }));
/*
app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (err) {
    logger.warn('Rate limit exceeded', { ip: req.ip });
    res.status(429).json({ error: 'Too many requests, please try again later' });
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
      logger.warn('CORS blocked', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Swagger API documentation
app.use(swaggerRoutes);

// Routes
app.get('/', (req, res) => {
  res.send('CarBar API, Visit: https://carbar-pi.vercel.app/ or /api-docs for documentation');
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = require('mongoose').connection.readyState === 1;
    const redisConnected = redisClient.isOpen;
    res.status(200).json({
      status: 'ok',
      dbConnected,
      redisConnected,
    });
  } catch (err) {
    logger.error('Health check failed', { error: err.message });
    res.status(500).json({ status: 'error', error: 'Health check failed' });
  }
});

app.get('/healthz', (req, res) => res.send('OK'));

app.get('/vapid-public-key', (req, res) => {
  logger.info('VAPID public key requested');
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
        logger.warn('Subscription validation failed', { errors: errors.array() });
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

      logger.info(`Subscription saved for user: ${req.entity._id}`);
      res.status(201).json({ message: 'Subscription saved' });
    } catch (error) {
      logger.error('Error saving subscription', { error: error.message });
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
        logger.warn('Notification validation failed', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, body } = req.body;
      const payload = JSON.stringify({
        title: sanitizeHtml(title),
        body: sanitizeHtml(body),
      });
      const results = [];

      const subscriptions = await Subscription.find({ userId: req.entity._id });
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
          results.push({ success: true, endpoint: sub.endpoint });
          logger.info(`Notification sent to ${sub.endpoint}`);
        } catch (err) {
          if (err.statusCode === 410) {
            await Subscription.deleteOne({ endpoint: sub.endpoint });
            logger.warn(`Removed expired subscription: ${sub.endpoint}`);
          }
          results.push({ success: false, endpoint: sub.endpoint, error: err.message });
          logger.error(`Failed to send notification to ${sub.endpoint}`, { error: err.message });
        }
      }

      res.json({ results });
    } catch (error) {
      logger.error('Error sending notification', { error: error.message });
      next(error);
    }
  }
);

app.use('/user', userRoutes);
app.use('/captain', captainRoutes);
app.use('/trips', tripRoutes);

app.use(errorMiddleware);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM. Performing graceful shutdown');
  await redisClient.quit();
  logger.info('Redis client shut down');
});

module.exports = app;
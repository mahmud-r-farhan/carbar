require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const sanitizeHtml = require('sanitize-html');
const webpush = require('web-push');
const { body, validationResult } = require('express-validator');
const { cleanEnv, str, num } = require('envalid');
const compression = require('compression');
const morgan = require('morgan');

const connectToDb = require('./db/db.js');
const { configureVapid } = require('./config/vapid');
const logger = require('./config/logger');
const userRoutes = require('./routes/user.routes');
const captainRoutes = require('./routes/captain.routes');
const swaggerRoutes = require('./docs/swagger');
const errorMiddleware = require('./middlewares/error.middleware');
const { auth } = require('./middlewares/auth.middleware');
const Subscription = require('./models/subscription.model');

const app = express();

// Validate environment variables
const env = cleanEnv(process.env, {
  DB_CONNECT: str(),
  JWT_SECRET: str(),
  EMAIL_HOST: str(),
  EMAIL_PORT: num(),
  EMAIL_USER: str(),
  EMAIL_PASS: str(),
  VAPID_PUBLIC_KEY: str(),
  VAPID_PRIVATE_KEY: str(),
  ALLOWED_ORIGINS: str(),
  PORT: num({ default: 3000 }),
  RATE_LIMIT_WINDOW_MS: num({ default: 15 * 60 * 1000 }), // 15 minutes
  RATE_LIMIT_MAX: num({ default: 100 }), // Max 100 requests per window
});

connectToDb();
configureVapid();

// Security middlewares
app.use(helmet());
app.use(mongoSanitize());
app.use(compression());
app.use(morgan('combined', { stream: logger.stream }));
app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    message: 'Too many requests, please try again later.',
  })
);

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = env.ALLOWED_ORIGINS.split(',');
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
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

/**
 * Gets VAPID public key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
app.get('/vapid-public-key', (req, res) => {
  logger.info('VAPID public key requested');
  res.json({ publicKey: env.VAPID_PUBLIC_KEY });
});

/**
 * Saves push notification subscription
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
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
      logger.error('Error saving subscription:', { error: error.message });
      next(error);
    }
  }
);

/**
 * Sends push notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
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
            // Subscription expired or invalid, remove it
            await Subscription.deleteOne({ endpoint: sub.endpoint });
            logger.warn(`Removed expired subscription: ${sub.endpoint}`);
          }
          results.push({ success: false, endpoint: sub.endpoint, error: err.message });
          logger.error(`Failed to send notification to ${sub.endpoint}:`, { error: err.message });
        }
      }

      res.json({ results });
    } catch (error) {
      logger.error('Error sending notification:', { error: error.message });
      next(error);
    }
  }
);

app.use('/user', userRoutes);
app.use('/captain', captainRoutes);
app.get('/healthz', (req, res) => res.send('OK'));

app.use(errorMiddleware);

module.exports = app;
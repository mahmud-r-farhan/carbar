const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const app = express();
const cookieParser = require('cookie-parser');
const connectTODb = require('./db/db');
const userRoutes = require('./routes/user.routes');
const captainRoutes = require('./routes/captain.routes');
const errorMiddleware = require('./middlewares/error.middleware');
const webpush = require('web-push');

connectTODb();

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',');

const corsOptions = {
  origin: function (origin, callback) {
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

// Web-push config
webpush.setVapidDetails(
  'mailto:dev@devplus.fun',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// In-memory store for subscriptions (replace with DB in production)
const subscriptions = [];

// Endpoint to get VAPID public key
app.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Endpoint to save subscription
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  // Avoid duplicates
  if (!subscriptions.find(sub => JSON.stringify(sub) === JSON.stringify(subscription))) {
    subscriptions.push(subscription);
  }
  res.status(201).json({ message: 'Subscription saved' });
});

// Endpoint to trigger push notification (for testing)
app.post('/send-notification', async (req, res) => {
  const { title, body } = req.body;
  const payload = JSON.stringify({ title, body });
  const results = [];
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
      results.push({ success: true });
    } catch (err) {
      results.push({ success: false, error: err.message });
    }
  }
  res.json({ results });
});

app.get('/', (req, res) => {
  res.send('CarBar API, Visit: https://carbar-pi.vercel.app/');
});

app.use('/user', userRoutes);
app.use('/captain', captainRoutes);

app.use(errorMiddleware);

module.exports = app;
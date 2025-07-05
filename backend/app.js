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

app.get('/', (req, res) => {
  res.send('CarBar API, Visit: https://carbar-pi.vercel.app/');
});

app.use('/user', userRoutes);
app.use('/captain', captainRoutes);

app.use(errorMiddleware);

module.exports = app;
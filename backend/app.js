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

app.use(cors({
  origin: '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send('CarBar API');
});

app.use('/user', userRoutes);
app.use('/captain', captainRoutes);

app.use(errorMiddleware);

module.exports = app;
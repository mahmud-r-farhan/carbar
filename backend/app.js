const dotenv = require ('dotenv')
dotenv.config();
const express = require ('express');
const cors = require ('cors');
const app = express();
const cookieParser = require('cookie-parser')
const connectTODb = require('./db/db');
const userRoutes = require ('./routes/user.routes');
const captainRoutess = require ('./routes/captain.routes')


connectTODb();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.get('/', (req, res) => {
    res.send('Hello World');
});

app.use('/user', userRoutes);
app.use('/captain', captainRoutess)


module.exports = app;
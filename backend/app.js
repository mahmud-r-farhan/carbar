const dotenv = require ('dotenv')
dotenv.config();
const express = require ('express');
const cors = require ('cors');
const app = express();
const connectTODb = require('./db/db');

connectTODb();

app.use(cors());



app.get('/', (req, res) => {
    res.send('Hello World');
});




module.exports = app;
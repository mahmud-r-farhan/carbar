const mongoose = require('mongoose');
const logger = require('../config/logger');

async function connectToDb() {
  try {
    await mongoose.connect(process.env.DB_CONNECT, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB Connected');
  } catch (err) {
    logger.error('MongoDB Connection Error:', { error: err.message });
    process.exit(1);
  }
}

module.exports = connectToDb;
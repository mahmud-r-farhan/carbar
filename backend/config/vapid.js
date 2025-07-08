const webpush = require('web-push');
const logger = require('./logger');

function configureVapid() {
  try {
    webpush.setVapidDetails(
      `mailto:${process.env.EMAIL_USER}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    logger.info('VAPID details configured successfully');
  } catch (error) {
    logger.error('Failed to configure VAPID details:', { error: error.message });
    throw error;
  }
}

module.exports = { configureVapid };
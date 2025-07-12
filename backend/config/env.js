const { cleanEnv, str, num } = require('envalid');

const env = cleanEnv(process.env, {
  DB_CONNECT: str({ desc: 'MongoDB connection string' }),
  JWT_SECRET: str({ desc: 'JWT secret for token verification' }),
  EMAIL_HOST: str({ desc: 'SMTP host for email service' }),
  EMAIL_PORT: num({ desc: 'SMTP port for email service' }),
  EMAIL_USER: str({ desc: 'SMTP user for email service' }),
  EMAIL_PASS: str({ desc: 'SMTP password for email service' }),
  VAPID_PUBLIC_KEY: str({ desc: 'VAPID public key for web push notifications' }),
  VAPID_PRIVATE_KEY: str({ desc: 'VAPID private key for web push notifications' }),
  ALLOWED_ORIGINS: str({ desc: 'Comma-separated list of allowed CORS origins' }),
  PORT: num({ default: 3000, desc: 'Server port' }),
  REDIS_URL: str({ desc: 'Redis connection URL', example: 'redis://red-xxx:6379' }),
  RATE_LIMIT_WINDOW_MS: num({ default: 15 * 60 * 1000, desc: 'Rate limit window in milliseconds' }),
  RATE_LIMIT_MAX: num({ default: 100, desc: 'Max requests per rate limit window' }),
  WS_BASE_URL: str({ desc: 'WebSocket base URL', example: 'wss://your-app.onrender.com' }),
  WS_PATH: str({ default: '/websocket', desc: 'WebSocket path' }),
});

module.exports = env;
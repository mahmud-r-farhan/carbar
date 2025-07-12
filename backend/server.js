const http = require('http');
const app = require('./app');
const { initWebSocket } = require('./services/websocket.service');
const { cleanEnv, num, str } = require('envalid');
const logger = require('./config/logger');

const env = cleanEnv(process.env, {
  PORT: num({ default: 3000, desc: 'Server port' }),
  WS_BASE_URL: str({ desc: 'WebSocket base URL', example: 'wss://your-app.onrender.com' }),
});

const server = http.createServer(app);
initWebSocket(server);

server.listen(env.PORT, () => {
  logger.info(`🚀 Server running on port ${env.PORT}`);
});

server.on('error', (error) => {
  logger.error('Server startup error:', { error: error.message });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM. Closing HTTP server...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});
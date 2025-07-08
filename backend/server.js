const app = require('./app');
const http = require('http');
const initWebSocket = require('./services/websocket.service');
const { cleanEnv, num } = require('envalid');
const logger = require('./config/logger');

const env = cleanEnv(process.env, {
  PORT: num({ default: 3000 }),
});

const server = http.createServer(app);
initWebSocket(server);

server.listen(env.PORT, () => {
  logger.info(`🚀 Server running on port ${env.PORT}`);
});
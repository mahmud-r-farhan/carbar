const WebSocket = require('ws');

// In-memory client tracking
const clients = new Map();

// WebSocket close codes
const WS_CLOSE_CODES = {
  AUTH_REQUIRED: 4001,
  INVALID_USER: 4002,
  AUTH_FAILED: 4003,
  INTERNAL_SERVER_ERROR: 4004,
  INVALID_MESSAGE: 4005,
};

module.exports = {
  WS_CLOSE_CODES,
  clients,
};

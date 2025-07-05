const http = require('http');
const app = require('./app');
const initWebSocket = require('./ws'); // WebSocket initializer

const port = process.env.PORT || 3000;

// Create HTTP server from Express app
const server = http.createServer(app);

// Initialize WebSocket server on top of HTTP server
initWebSocket(server); // <-- this is the key line

// Start server
server.listen(port, () => {
  console.log(`🚀 Server listening on http://localhost:${port}`);
});

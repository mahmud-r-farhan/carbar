const WebSocket = require('ws');

let wss = null;
const clients = new Set();

function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('🟢 Client connected. Total:', clients.size);

    ws.on('message', (message) => {
      // Broadcast to all other clients
      for (const client of clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });
  });

  console.log('✅ WebSocket server initialized');
}

module.exports = initWebSocket;
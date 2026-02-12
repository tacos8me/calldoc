// DevLink3 Simulator - Placeholder
// Emulates Avaya IP Office DevLink3 protocol on TCP:50797
// To be implemented with realistic call center event generation

const net = require('net');

const PORT = 50797;

const server = net.createServer((socket) => {
  console.log('DevLink3 client connected');
  socket.on('close', () => console.log('DevLink3 client disconnected'));
  socket.on('error', (err) => console.error('DevLink3 socket error:', err.message));
});

server.listen(PORT, () => {
  console.log(`DevLink3 simulator listening on port ${PORT}`);
});

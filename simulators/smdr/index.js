// SMDR Simulator - Placeholder
// Emulates Avaya IP Office SMDR output on TCP:1150
// To be implemented with realistic CSV call detail records

const net = require('net');

const PORT = 1150;

const server = net.createServer((socket) => {
  console.log('SMDR client connected');
  socket.on('close', () => console.log('SMDR client disconnected'));
  socket.on('error', (err) => console.error('SMDR socket error:', err.message));
});

server.listen(PORT, () => {
  console.log(`SMDR simulator listening on port ${PORT}`);
});

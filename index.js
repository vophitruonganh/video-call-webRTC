const app = require("express")();
const httpServer = require("http").createServer(app);

const options = {
  path: '/',
  transports: ["websocket", "polling"],
  serveClient: true,
  pingInterval: 10000,
  pingTimeout: 5000,
  cookie: false,
  cors: {
    origin: "*"
  }
};

const io = require("socket.io")(httpServer, options);

const redis = require("socket.io-redis");
io.adapter(redis({ host: "localhost", port: 6379 }));

io.on('connection', function (socket) {
  socket.on('message', function (message) {
    console.log(`Client ${socket.id} said: ${message}`);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
    // socket.to(message.room).emit('message', message);
  });

  socket.on('create or join', function (room) {
    console.log('Received request to create or join room ' + room);

    const clientsInRoom = io.sockets.adapter.rooms[room];
    const numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    console.log('Room ' + room + ' now has ' + numClients + ' client(s)');

    switch (numClients) {
      case numClients === 0:
        socket.join(room);
        console.log('Client ID ' + socket.id + ' created room ' + room);
        socket.emit('created', room, socket.id);
        break;
      case numClients === 1:
        console.log('Client ID ' + socket.id + ' joined room ' + room);
        io.in(room).emit('join', room);
        socket.join(room);
        socket.emit('joined', room, socket.id);
        io.in(room).emit('ready');
        break;
      case numClients >= 2:
        console.log(`Room: ${room} is full member`);
        socket.emit('full', room);
        break;
    }
  });

  socket.on('ipaddr', function() {
    const ifaces = os.networkInterfaces();
    for (let dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function () {
    console.log('received bye');
  });

});

httpServer.listen(8888, () => {
  console.log(`start server with port`, 8888)
});

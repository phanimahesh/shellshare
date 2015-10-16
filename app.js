
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var io = require('socket.io');
var logger = require('morgan');
var bodyParser = require('body-parser');
var errorHandler = require('errorhandler');

var config = require('./config');
var indexRoute = require('./routes/index');
var roomsRoute = require('./routes/rooms');

var app = express();
var server = http.createServer(app);

app.set('port', config.express.port);
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

if (config.env == 'development') {
  app.use(errorHandler());
}

server.listen(app.get('port'));

app.use('/', indexRoute);
app.use('/r', roomsRoute);
app.post('/r/:room', function(req, res) {
  var room = req.url,
      size = req.body.size,
      message = req.body.message;

  io.sockets.in(room).emit('size', size);
  io.sockets.in(room).emit('message', message);
  res.sendStatus(200);
});

io = io.listen(server);

io.sockets.on('connection', function (socket) {
  var rooms = [];

  socket.on('join', function (room) {
    socket.join(room, function (err) {
      if (!err) {
        rooms.push(room);
        updateUsersCount(io, room);
      }
    });
  });

  socket.on('disconnect', function () {
    for (var i in rooms) {
      updateUsersCount(io, rooms[i]);
    }
  });
});

function updateUsersCount(io, room) {
  var clients = io.sockets.adapter.rooms[room];

  if (clients !== undefined) {
    io.sockets.in(room).emit('usersCount', Object.keys(clients).length);
  }
}

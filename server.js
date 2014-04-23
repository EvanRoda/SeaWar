var express = require('express');
var http = require('http');
var path = require('path');
var app = express();

app.use(express.static(path.join(__dirname, 'static')));

var players = [];

var server = http.createServer(app);
server.listen(3000, function(){
    console.log('Express server listening on port ' + 3000);
});

io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket) {
    socket.on('new_player', function (data) {
        players.push(data);
    });
});

var intId = setInterval(function(){
    io.sockets.emit('gamedata', players);
}, 1000);
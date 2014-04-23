/**
 * Служебные переменные
 */
var express = require('express');
var http = require('http');
var path = require('path');
var _ = require('lodash');

var app = express();
var server = http.createServer(app);

/**
 * Игровые переменные
 */
var gameDelay = 1500;  // пока полторы чтобы не часто
var players = [];

//Координаты сетки
var grid_start = 135;
var grid_delta = 270;

var grid = [
    {x: 135, y: 135, side: 'leaf', is_free: true, number: 0},
    {x: 135, y: 405, side: 'leaf', is_free: true, number: 1},
    {x: 135, y: 675, side: 'leaf', is_free: true, number: 2},
    {x: 405, y: 135, side: 'leaf', is_free: true, number: 3},
    {x: 405, y: 405, side: 'leaf', is_free: true, number: 4},
    {x: 405, y: 675, side: 'leaf', is_free: true, number: 5},

    {x: 135, y: 135, side: 'fire', is_free: true, number: 0},
    {x: 135, y: 405, side: 'fire', is_free: true, number: 1},
    {x: 135, y: 675, side: 'fire', is_free: true, number: 2},
    {x: 405, y: 135, side: 'fire', is_free: true, number: 3},
    {x: 405, y: 405, side: 'fire', is_free: true, number: 4},
    {x: 405, y: 675, side: 'fire', is_free: true, number: 5}
];

app.use(express.static(path.join(__dirname, 'static')));

server.listen(3000, function(){
    console.log('Express server listening on port ' + 3000);
});

io = require('socket.io').listen(server);

io.sockets.on('connection', function(socket){
    socket.on('new_player', function(data){
        players.push(data);
    });
    socket.on('create_player_object', function(data){

    });
});

var intId = setInterval(function(){
    io.sockets.emit('gamedata', players);
}, gameDelay);
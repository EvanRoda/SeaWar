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
var game_objects = [];

//Координаты сетки
var grid_start = 135;
var grid_delta = 270;

var grid = [
    {x: 135, y: 135, side: 'leaf', is_free: true, number: 0},
    {x: 135, y: 405, side: 'leaf', is_free: false, number: 1},
    {x: 135, y: 675, side: 'leaf', is_free: true, number: 2},
    {x: 405, y: 135, side: 'leaf', is_free: true, number: 3},
    {x: 405, y: 405, side: 'leaf', is_free: true, number: 4},
    {x: 405, y: 675, side: 'leaf', is_free: true, number: 5},

    {x: 135, y: 135, side: 'fire', is_free: true, number: 0},
    {x: 135, y: 405, side: 'fire', is_free: false, number: 1},
    {x: 135, y: 675, side: 'fire', is_free: true, number: 2},
    {x: 405, y: 135, side: 'fire', is_free: true, number: 3},
    {x: 405, y: 405, side: 'fire', is_free: true, number: 4},
    {x: 405, y: 675, side: 'fire', is_free: true, number: 5}
];

function CreateGameObject(type, x, y, parent_id){
    var player = _.findWhere(players, {_id: parent_id});
    if(player){
        this.type = type;
        this.x = x;
        this.y = y;
        this.parent_id = parent_id;
        this.side = player.side;
        if(type == 'canon'){
            this.direction = 90;
        }else if(type == 'hull'){
            this.direction = 0;
        }
    }
}

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
        game_objects.push(new CreateGameObject('canon', 405, 405, data.parent_id));
    });
});

var intId = setInterval(function(){
    io.sockets.emit('gamedata', game_objects);
}, gameDelay);
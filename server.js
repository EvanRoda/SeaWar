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
    {x: 135, y: 135, side: 'leaf', is_free: true, number: 0, child_id: ''},
    {x: 135, y: 405, side: 'leaf', is_free: false, number: 1, child_id: ''},
    {x: 135, y: 675, side: 'leaf', is_free: true, number: 2, child_id: ''},
    {x: 405, y: 135, side: 'leaf', is_free: true, number: 3, child_id: ''},
    {x: 405, y: 405, side: 'leaf', is_free: true, number: 4, child_id: ''},
    {x: 405, y: 675, side: 'leaf', is_free: true, number: 5, child_id: ''},

    {x: 135, y: 135, side: 'fire', is_free: true, number: 0, child_id: ''},
    {x: 135, y: 405, side: 'fire', is_free: false, number: 1, child_id: ''},
    {x: 135, y: 675, side: 'fire', is_free: true, number: 2, child_id: ''},
    {x: 405, y: 135, side: 'fire', is_free: true, number: 3, child_id: ''},
    {x: 405, y: 405, side: 'fire', is_free: true, number: 4, child_id: ''},
    {x: 405, y: 675, side: 'fire', is_free: true, number: 5, child_id: ''}
];

var shipsTemplates = {
    first: [
        {type: 'canon', dx: 0, dy: 0}
    ],
    second: [
        {type: 'canon', dx: 0, dy: -50},
        {type: 'canon', dx: 0, dy: 50}
    ]
};

function createShip(player, shipType){
    player.ship = [];
    shipsTemplates[shipType].forEach(function(obj){
        var newObj = {
            type: obj.type,
            x: player.x + obj.dx,
            y: player.y + obj.dy
        };
        if(obj.type == 'canon'){
            newObj.direction = 90;
        }else if(obj.type == 'hull'){
            newObj.direction = 0;
        }
        player.ship.push(newObj);
    });
}

app.use(express.static(path.join(__dirname, 'static')));

server.listen(3000, function(){
    console.log('Express server listening on port ' + 3000);
});

io = require('socket.io').listen(server);

io.sockets.on('connection', function(socket){
    // Создание нового игрока
    socket.on('new_player', function(data){
        var grid_cell = _.findWhere(grid, {side: data.side, is_free: true});
        grid_cell.is_free = false;
        grid_cell.child_id = data._id;
        data.x = grid_cell.x;
        data.y = grid_cell.y;
        data.ship = [];
        players.push(data);
    });

    // Создание объектов для игрока
    socket.on('create_player_object', function(data){
        var player = _.findWhere(players, {_id: data.parent_id});
        createShip(player, data.ship_type);
    });
});

var intId = setInterval(function(){
    if(players.length){
        players.forEach(function(player){
            player.ship.forEach(function(obj){
                obj.direction = obj.direction + 10;
            });
        });
    }
    io.sockets.emit('gamedata', players);
}, gameDelay);

/**
 * Модель player (Игрок)
 *
 * _id
 * name
 * side
 * x
 * y
 * reload               // Время перезарядки орудий
 * reload_counter       // Счетчик перезарядки
 * ship [
 *      ... //Список объектов игрока (корпус пушки снаряды)
 * ]
 */

/**
 * Игровой объект
 *
 * type //hull canon ammo
 * x
 * y
 * direction
 * distance //for ammo
 * distance_counter // for ammo
 */
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
var gameDelay = 100;  // пока полторы чтобы не часто
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
        {type: 'hull', dx: 0, dy: 0},
        {type: 'canon', dx: 1, dy: -55},
        {type: 'canon', dx: 1, dy: 75}
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
            newObj.given_direction = 90;
            newObj.delta_direction = 0;
            newObj.angle_speed = 20;
        }else if(obj.type == 'hull'){
            newObj.direction = 0;
        }
        player.ship.push(newObj);
    });
}

function markOfNumber(number){
    return number<0 ? -1 : 1;
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

    //Прием команды от игрока
    socket.on('command', function(data){
        var player = _.findWhere(players, {_id: data.player_id});
        console.log(data);
        var command =  data.command.split(' ', 2);
        console.log('РАЗОБРАННАЯ КОМАНДА');
        console.log(command);
        if(command[0].toUpperCase() == 'НАПРАВЛЕНИЕ'){
            player.ship.forEach(function(obj){
                if(obj.type == 'canon'){
                    obj.given_direction = parseInt(command[1]) - obj.delta_direction;
                }
            });
        }else if(command[0].toUpperCase() == 'СВЕДЕНИЕ'){
            var range = parseInt(command[1]);
            if(range>0){
                player.ship.forEach(function(obj){
                    if(obj.type == 'canon'){
                        var dy = player.y - obj.y;
                        obj.delta_direction = Math.atan(-1*dy/range)*180/Math.PI;
                        obj.given_direction = obj.given_direction - obj.delta_direction;
                    }
                });
            }else{
                player.ship.forEach(function(obj){
                    if(obj.type == 'canon'){
                        obj.given_direction = obj.given_direction + obj.delta_direction;
                        obj.delta_direction = 0;
                    }
                });
            }
        }else if(command[0].toUpperCase() == 'ДАЛЬНОСТЬ'){
            player.distance = parseInt(command[1]);
        }else if(command[0].toUpperCase() == 'ОГОНЬ'){
            player.ship.forEach(function(obj){
                if(obj.type == 'canon'){
                    var ammo = {
                        type: 'ammo'
                    };
                    player.ship.push(ammo);
                }
            });
        }
    });
});

var intId = setInterval(function(){
    if(players.length){
        players.forEach(function(player){
            player.ship.forEach(function(obj){
                if(obj.type == 'canon'){
                    var delta = obj.given_direction - obj.direction;
                    if(delta){
                        var trueAngleSpeed = obj.angle_speed*(gameDelay/1000);
                        if(Math.abs(delta) > trueAngleSpeed){
                            obj.direction = obj.direction + markOfNumber(delta)*trueAngleSpeed;
                        }else{
                            obj.direction = obj.given_direction;
                        }
                    }
                }
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
 * distance
 * ship [
 *      ... //Список объектов игрока (корпус пушки снаряды)
 * ]
 */

/**
 * Игровой объект
 *
 * type                 //hull canon ammo
 * x
 * y
 * direction
 * given_direction      // заданное направление
 * delta_direction      // угол сведения, только для пушек, по умолчанию 0
 * angle_speed          // Скорость поворота
 * reload               // Время перезарядки орудий
 * reload_counter       // Счетчик перезарядки
 * status               // только для пушек, цела/поврежденв == true/false
 * distance             // for ammo
 * distance_counter     // for ammo
 */
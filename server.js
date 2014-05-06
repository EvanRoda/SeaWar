/**
 * Служебные переменные
 */
var express = require('express');
var http = require('http');
var path = require('path');
var _ = require('lodash');
var shipsTemplates = require('./shipTemplates');

var app = express();
var server = http.createServer(app);
var sockets = [];

/**
 * Игровые переменные
 */
var players = [];
var world = {battleOn: false};
var intId = null;

var grid = [
    {x: 60, y: 135, side: 'leaf', is_free: true, number: 0, child_id: ''},
    {x: 70, y: 405, side: 'leaf', is_free: false, number: 1, child_id: ''},
    {x: 60, y: 675, side: 'leaf', is_free: true, number: 2, child_id: ''},
    {x: 210, y: 135, side: 'leaf', is_free: true, number: 3, child_id: ''},
    {x: 220, y: 405, side: 'leaf', is_free: true, number: 4, child_id: ''},
    {x: 210, y: 675, side: 'leaf', is_free: true, number: 5, child_id: ''},

    {x: 60,  y: 135, side: 'fire', is_free: true, number: 0, child_id: ''},
    {x: 70,  y: 405, side: 'fire', is_free: false, number: 1, child_id: ''},
    {x: 60,  y: 675, side: 'fire', is_free: true, number: 2, child_id: ''},
    {x: 210, y: 135, side: 'fire', is_free: true, number: 3, child_id: ''},
    {x: 220, y: 405, side: 'fire', is_free: true, number: 4, child_id: ''},
    {x: 210, y: 675, side: 'fire', is_free: true, number: 5, child_id: ''}
];

// Настройки
var opt = {
    width: 954,
    height: 810,
    delay: 100,
    maxWind: 0.1,
    ammoSpeed: 100,
    missLifeTime: 2500,  // ms милисекунды
    canonRadius: 20,
    barrelLength: 25
};

function startBattle(){
    world = {
        battleOn: true,
        windForce: null,
        endCounter: 10000,   // ms милисекунды
        resources: {
            leaf: 15,
            fire: 15
        }
    };

    world.windForce = _.random(-opt.maxWind, opt.maxWind, true);

    intId = setInterval(function(){
        if(players.length){
            var alive = {leaf: 0, fire: 0};
            players.forEach(function(player){
                var deleteList = [];
                if(player.ship.length){
                    player.isDefeat = true;
                }
                player.ship.forEach(function(obj, index){
                    var delta = null;
                    //расчет пушки
                    if(obj.type == 'canon' && obj.status){
                        player.isDefeat = false;
                        delta = obj.given_direction - obj.direction;
                        if(delta){
                            var trueAngleSpeed = obj.angle_speed*(opt.delay/1000);
                            if(Math.abs(delta) > trueAngleSpeed){
                                obj.direction = obj.direction + markOfNumber(delta)*trueAngleSpeed;
                            }else{
                                obj.direction = obj.given_direction;
                            }
                        }
                    }

                    //расчет снаряда
                    else if(obj.type == 'ammo'){
                        var angle = obj.direction*Math.PI/180;
                        delta = obj.distance - obj.distance_counter;
                        var trueAmmoSpeed = obj.ammo_speed*opt.delay/1000;

                        if(delta > trueAmmoSpeed){
                            obj.x = obj.x + Math.sin(angle)*trueAmmoSpeed;
                            obj.y = obj.y - Math.cos(angle)*trueAmmoSpeed;
                            obj.distance_counter = obj.distance_counter + trueAmmoSpeed;
                            obj.direction = obj.direction + (player.side == 'leaf' ? 1 : -1)*world.windForce;
                        }else{
                            obj.x = obj.x + Math.sin(angle)*delta;
                            obj.y = obj.y - Math.cos(angle)*delta;
                            obj.distance_counter = obj.distance;

                            // Проверка столкновений
                            players.forEach(function(t_player){
                                var vir_x, vir_y, hull_range, isMiss = true;
                                if(player.side != t_player.side){
                                    vir_x = opt.width - t_player.x;
                                    vir_y = opt.height - t_player.y;
                                }else{
                                    vir_x = t_player.x;
                                    vir_y = t_player.y;
                                }
                                hull_range = Math.sqrt(Math.pow(vir_x - obj.x, 2) + Math.pow(vir_y - obj.y, 2));

                                if(hull_range < 100){
                                    t_player.ship.forEach(function(target){
                                        var target_range = null;

                                        if(player.side != t_player.side){
                                            vir_x = opt.width - target.x;
                                            vir_y = opt.height - target.y;
                                        }else{
                                            vir_x = target.x;
                                            vir_y = target.y;
                                        }

                                        if(target.type == 'canon'){
                                            target_range = Math.sqrt(Math.pow(vir_x - obj.x, 2) + Math.pow(vir_y - obj.y, 2));
                                            if(target_range < opt.canonRadius){
                                                target.status = false;
                                                isMiss = false;
                                            }
                                        }
                                    });
                                }
                                if(isMiss){
                                    // Заменяем объект ammo на miss ("круги на воде")
                                    obj.type = 'miss';
                                    obj.reload = opt.missLifeTime;
                                    obj.reload_counter = 0;
                                }
                            });
                        }
                    }else if(obj.type == 'miss'){
                        delta = obj.reload - obj.reload_counter;
                        if(delta > opt.delay){
                            obj.reload_counter = obj.reload_counter + opt.delay;
                        }else{
                            deleteList.push(index);
                        }
                    }
                });
                if(!player.isDefeat){
                    alive[player.side] += 1;
                }
                if(player.isDefeat && player._id){
                    var playerSocket = io.sockets.sockets[player._id];
                    if(playerSocket){
                        playerSocket.emit('to_start_screen', 'Пнем малыша');
                        player._id = '';
                    }
                }
                deleteList.forEach(function(obj_index, index){
                    player.ship.splice(obj_index - index, 1);
                });
            });
            if(!alive.leaf || !alive.fire){
                world.endCounter = world.endCounter - opt.delay;
            }else{
                world.endCounter = 10000;
            }
            if(world.endCounter <= 0){
                if(alive.leaf){
                    endBattle('leaf');
                }else if(alive.fire){
                    endBattle('fire');
                }else{
                    endBattle(null);
                }
            }
        }
        io.sockets.emit('gamedata', {options: opt, world: world, players: players});
    }, opt.delay);
}

function endBattle(winSide){
    players.forEach(function(player){
        if(!player.isDefeat){
            player.ship.forEach(function(obj){
                if(obj.type == 'canon' && obj.status){
                    world.resources[player.side] += obj.barrels.length;
                }
            });
        }
    });
    if(winSide){
        world.resources[winSide] += 3;
    }
    players = [];
    io.sockets.emit('to_start_screen', '');
    clearInterval(intId);
    world.battleOn = false;

    grid = [
        {x: 60, y: 135, side: 'leaf', is_free: true, number: 0, child_id: ''},
        {x: 70, y: 405, side: 'leaf', is_free: false, number: 1, child_id: ''},
        {x: 60, y: 675, side: 'leaf', is_free: true, number: 2, child_id: ''},
        {x: 210, y: 135, side: 'leaf', is_free: true, number: 3, child_id: ''},
        {x: 220, y: 405, side: 'leaf', is_free: true, number: 4, child_id: ''},
        {x: 210, y: 675, side: 'leaf', is_free: true, number: 5, child_id: ''},

        {x: 60,  y: 135, side: 'fire', is_free: true, number: 0, child_id: ''},
        {x: 70,  y: 405, side: 'fire', is_free: false, number: 1, child_id: ''},
        {x: 60,  y: 675, side: 'fire', is_free: true, number: 2, child_id: ''},
        {x: 210, y: 135, side: 'fire', is_free: true, number: 3, child_id: ''},
        {x: 220, y: 405, side: 'fire', is_free: true, number: 4, child_id: ''},
        {x: 210, y: 675, side: 'fire', is_free: true, number: 5, child_id: ''}
    ];
}

function createShip(player, shipType){
    player.ship = [];
    var template = _.findWhere(shipsTemplates, {side: player.side, kind: shipType});
    template.objects.forEach(function(obj){
        var newObj = {
            type: obj.type,
            x: player.x + obj.dx,
            y: player.y + obj.dy
        };
        if(obj.type == 'canon'){
            newObj.direction = obj.direction;
            newObj.given_direction = obj.direction;
            newObj.delta_direction = 0;
            newObj.angle_speed = 20;
            newObj.ammo_speed = opt.ammoSpeed;
            newObj.reload = 10;
            newObj.reload_counter = 10;
            newObj.status = true;
            newObj.kind = shipType;
            newObj.barrels = obj.barrels;
        }else if(obj.type == 'hull'){
            newObj.kind = shipType;
            newObj.direction = 0;
        }
        player.ship.push(newObj);
    });
}

function markOfNumber(number){
    return number<0 ? -1 : 1;
}

function getRandom(value, percent){
    var dv = value * percent / 100;
    return _.random(-dv, dv, true);
}

function kickPlayer(player_id){
    var player = _.findWhere(players, {_id: player_id});
    if(player){
        player.ship.forEach(function(obj){
            if(obj.type == 'canon' && obj.status){
                obj.status = false;
            }
        });
    }
}

app.use(express.static(path.join(__dirname, 'static')));

server.listen(3000, function(){
    console.log('Express server listening on port ' + 3000);
});

io = require('socket.io').listen(server);

io.sockets.on('connection', function(socket){
    socket.emit('options', {options: opt, templates: shipsTemplates, player_id: socket.id});
    sockets.push(socket);

    // Создание нового игрока
    socket.on('new_player', function(data){
        var grid_cell = _.findWhere(grid, {side: data.side, is_free: true});
        if(grid_cell){
            grid_cell.is_free = false;
            grid_cell.child_id = socket.id;
            data.x = grid_cell.x;
            data.y = grid_cell.y;
            data.distance = 300;
            data.ship = [];
            data.isDefeat = false;
            data._id = socket.id;
            players.push(data);
        }else{
            // ... Какое-то сообщение о том что мест в сетке нет
        }
        if(!world.battleOn){
            startBattle();
        }
    });

    // Создание объектов для игрока
    socket.on('create_player_object', function(data){
        var player = _.findWhere(players, {_id: data.parent_id});
        if(player){
            createShip(player, data.ship_type);
        }
    });

    //Прием команды от игрока
    socket.on('command', function(data){
        var player = _.findWhere(players, {_id: data.player_id});
        var command =  data.command.split(' ', 2);
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
                if(obj.type == 'canon' && obj.status){
                    var dy = opt.barrelLength;
                    obj.barrels.forEach(function(dx){
                        var c = Math.sqrt(dx*dx + dy*dy);
                        var alfa = obj.direction * Math.PI / 180;
                        var beta = Math.asin(dy/c);
                        var ammo = {
                            type: 'ammo',
                            x: obj.x + c * Math.sin((dx > 0 ? (Math.PI/2 - beta) : (beta - Math.PI/2)) + alfa),
                            y: obj.y - c * Math.cos((dx > 0 ? (Math.PI/2 - beta) : (beta - Math.PI/2)) + alfa),
                            direction: obj.direction + getRandom(0.5, 100),
                            ammo_speed: obj.ammo_speed,
                            distance: player.distance + getRandom(player.distance, 0.5),
                            distance_counter: 0
                        };
                        player.ship.push(ammo);
                    });
                }
            });
        }
    });

    // Выкидываем игрока на начальный экран
    // по кнопке
    socket.on('leave_battle', function(data){
        kickPlayer(data._id);
    });
    // по дисконнекту
    socket.on('disconnect', function(){
        kickPlayer(socket.id);
    });
});

/**
 * Модель player (Игрок)
 *
 * _id
 * name
 * side
 * x
 * y
 * distance
 * isDefeat
 * ship [
 *      ... //Список объектов игрока (корпус пушки снаряды)
 * ]
 */

/**
 * Игровой объект
 *
 * type                 //hull canon ammo miss
 * x
 * y
 * kind                 // только для hull тип карабля
 * direction            // текущее направление
 * given_direction      // заданное направление
 * delta_direction      // угол сведения, только для пушек, по умолчанию 0
 * angle_speed          // Скорость поворота
 * reload               // Время перезарядки орудий (для кругов время отображения круга)
 * reload_counter       // Счетчик перезарядки
 * status               // только для пушек, цела/поврежденв == true/false
 * ammo_speed           // скорость снаряда ( пушки и снаряды )
 * distance             // for ammo
 * distance_counter     // for ammo
 */
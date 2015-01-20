/**
 * Служебные переменные
 */
var express = require('express');
var http = require('http');
var path = require('path');
var _ = require('lodash');
var shipsTemplates = require('./shipTemplates');
var utils = require('./utils');
var opt = require('./options');
var defaultGrid = require('./grid');

var app = express();
var server = http.createServer(app);
var sockets = [];

/**
 * Игровые переменные
 */

var intId = null;
var io;

var grid = utils.extend({}, defaultGrid);

var world = {
    battle: {
        status: 'none' // Возможные варианты: wait  start
    },
    battleOn: false,        // todo: Заменить на battle.status
    battleStart: false,     //

    players: {},    // словарь ключи = id-шники
    lobby: [],      // список id игроков в лобби
    inBattle: [],   // список id игроков в битве

    windForce: null,
    endCounter: opt.defaultEndCounter,   // ms милисекунды
    windCounter: opt.defaultWindCounter,   // ms милисекунды
    resources: {
        leaf: 15,
        fire: 15
    }
};

function canonCalc(canon, player){
    var delta = null, playerSocket;
    if(canon.status){
        player.isDefeat = false;
        delta = canon.given_direction - canon.direction;
        if(delta){
            var trueAngleSpeed = canon.angle_speed*(opt.delay/1000);
            if(Math.abs(delta) > trueAngleSpeed){
                canon.direction = canon.direction + utils.markOfNumber(delta)*trueAngleSpeed;
            }else{
                canon.direction = canon.given_direction;
            }
        }
        if(canon.reload_counter > 0){
            canon.reload_counter -= opt.delay;
            if(canon.reload_counter <= 0){
                playerSocket = io.sockets.sockets[player._id];
                if(playerSocket){
                    playerSocket.emit('messages', {show: true, color: 'alert-info', strong: 'Орудия заряжены', span: ''});
                }
            }
        }
    }
}

function ammoCalc(ammo, player){
    var angle = ammo.direction*Math.PI/180;
    var delta = ammo.distance - ammo.distance_counter;
    var trueAmmoSpeed = ammo.ammo_speed*opt.delay/1000;

    if(delta > trueAmmoSpeed){
        ammo.x = ammo.x + Math.sin(angle)*trueAmmoSpeed;
        ammo.y = ammo.y - Math.cos(angle)*trueAmmoSpeed;
        ammo.distance_counter = ammo.distance_counter + trueAmmoSpeed;
        ammo.direction = ammo.direction + (player.side == 'leaf' ? 1 : -1)*world.windForce;
    }else{
        ammo.x = ammo.x + Math.sin(angle)*delta;
        ammo.y = ammo.y - Math.cos(angle)*delta;
        ammo.distance_counter = ammo.distance;

        // Проверка столкновений
        world.inBattle.forEach(function(id){
            var vir_x, vir_y, hull_range, isMiss = true, t_player = world.players[id];
            if(player.side != t_player.side){
                vir_x = opt.width - t_player.x;
                vir_y = opt.height - t_player.y;
            }else{
                vir_x = t_player.x;
                vir_y = t_player.y;
            }
            hull_range = Math.sqrt(Math.pow(vir_x - ammo.x, 2) + Math.pow(vir_y - ammo.y, 2));

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
                        target_range = Math.sqrt(Math.pow(vir_x - ammo.x, 2) + Math.pow(vir_y - ammo.y, 2));
                        if(target_range < opt.canonRadius){
                            target.status = false;
                            isMiss = false;
                        }
                    }
                });
            }
            if(isMiss){
                // Заменяем объект ammo на miss ("круги на воде")
                ammo.type = 'miss';
                ammo.reload = opt.missLifeTime;
                ammo.reload_counter = 0;
            }
        });
    }
}

function missCalc(miss, index, deleteList){
    var delta = miss.reload - miss.reload_counter;
    if(delta > opt.delay){
        miss.reload_counter = miss.reload_counter + opt.delay;
    }else{
        deleteList.push(index);
    }
}

// todo: Создать событие для вызова фции startBattle
function startBattle(){
    // todo: В будущем в бой нужно отправлять не всех, а по шесть человек из каждой команды
    world.inBattle = world.lobby;
    world.lobby = [];

    //todo: Написать функцию распределения игроков по точкам сетки (или даже отказаться от сетки)

    world.battle.status = 'start';
    world.endCounter = opt.defaultEndCounter;
    world.windCounter = opt.defaultWindCounter;
    world.windForce = _.random(-opt.maxWind, opt.maxWind, true);

    io.sockets.emit('messages', {show: true, color: 'alert-success', strong: 'Битва началась', span: ''});
    intId = setInterval(gameCycle, opt.delay);
}

function gameCycle(){
    if(world.inBattle.length){
        var alive = {leaf: 0, fire: 0};
        world.inBattle.forEach(function(id){
            var deleteList = [], player = world.players[id];
            if(player.ship.length){
                player.isDefeat = true;
                player.ship.forEach(function(obj, index){
                    if(obj.type == 'canon'){
                        canonCalc(obj, player);
                    }else if(obj.type == 'ammo'){
                        ammoCalc(obj, player);
                    }else if(obj.type == 'miss'){
                        missCalc(obj, index, deleteList);
                    }
                });
            }

            if(player.isDefeat){
                if(player._id){
                    var playerSocket = io.sockets.sockets[player._id];
                    if(playerSocket){
                        playerSocket.emit('to_start_screen', world);
                        player._id = '';
                    }
                }
            }else{
                alive[player.side] += 1;
            }

            deleteList.forEach(function(obj_index, index){
                player.ship.splice(obj_index - index, 1);
            });
        });

        world.battleStart = !world.battleStart ? (alive.leaf && alive.fire) : true;
        world.endCounter = (!alive.leaf || !alive.fire) ? world.endCounter - opt.delay : opt.defaultEndCounter;
        if(world.endCounter <= 0 && world.battleStart){
            if(alive.leaf){
                endBattle('leaf');
            }else if(alive.fire){
                endBattle('fire');
            }else{
                endBattle(null);
            }
        }
    }

    // Смена направление и силы ветра по времени
    world.windCounter -= opt.delay;
    if(world.windCounter <= 0){
        world.windCounter = opt.defaultWindCounter;
        world.windForce = _.random(-opt.maxWind, opt.maxWind, true);
    }

    // Отправка игровых данных на клиент
    io.sockets.emit('gamedata', {options: opt, world: world});
}

function endBattle(winSide){
    world.inBattle.forEach(function(id){
        var player = world.players[id];
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
    //players = [];
    world.inBattle = [];
    io.sockets.emit('to_start_screen', world);
    clearInterval(intId);
    world.battle.status = 'none';

    grid = utils.extend({}, defaultGrid);
}

function createShip(player, shipType){
    player.ship = [];
    var template = _.findWhere(shipsTemplates, {side: player.side, kind: shipType});
    template.objects.forEach(function(obj){
        var resources = 0;
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
            newObj.reload = obj.reload;
            newObj.reload_counter = 0;
            newObj.status = true;
            newObj.kind = shipType;
            newObj.barrels = obj.barrels;
            newObj.min_angle = obj.angles[0];
            newObj.max_angle = obj.angles[1];
            resources += obj.barrels.length;
        }else if(obj.type == 'hull'){
            newObj.kind = shipType;
            newObj.direction = 0;
        }
        world.resources[player.side] -= resources;
        player.ship.push(newObj);
    });
    io.sockets.emit('buttons', world);
}

function kickPlayer(player_id){
    var player = world.players[player_id];
    var resources = 0;
    if(player){
        player.ship.forEach(function(obj){
            if(obj.type == 'canon' && obj.status){
                obj.status = false;
                resources = obj.barrels.length;
            }
        });
        if(!world.battleStart){
            world.resources[player.side] += resources;
            io.sockets.emit('buttons', world);
        }
    }
}

app.use(express.static(path.join(__dirname, 'static')));

server.listen(3000, function(){
    console.log('Express server listening on port ' + 3000);
});

io = require('socket.io').listen(server);

io.sockets.on('connection', function(socket){
    socket.emit('options', {options: opt, world: world, templates: shipsTemplates, player_id: socket.id});
    sockets.push(socket);

    // Создание нового игрока
    socket.on('new_player', function(data){
        if(!data.nickName){
            data.nickName = 'Captain' + socket.id;
            socket.emit('set_name', data.nickName);
        }
        data.x = 0;
        data.y = 0;
        data.distance = 300;
        data.ship = [];
        data.isDefeat = false;
        data._id = socket.id;

        world.players[data._id] = data;
        io.sockets.emit('messages', {show: true, color: 'alert-info', strong: 'Игрок ' + data.nickName + ' входит в игру', span: ''});
        io.sockets.emit('update_player_list', world);

        //todo: Код ниже нужно выполнить при создании боя для каждого игрока
        /*var grid_cell = _.findWhere(grid, {side: data.side, is_free: true});
        if(grid_cell){
            grid_cell.is_free = false;
            grid_cell.child_id = socket.id;
            data.x = grid_cell.x;
            data.y = grid_cell.y;
            data.distance = 300;
            data.ship = [];
            data.isDefeat = false;
            data._id = socket.id;

            world.players[data._id] = data;
            //players.push(data);
        }else{
            socket.emit('messages', {show: true, color: 'alert-error', strong: 'Для тебя нет места.', span: ''});
        }
        if(!world.battleOn){
            startBattle();
        }*/
    });

    socket.on('to_lobby', function(){
        world.lobby.push(socket.id);
        io.sockets.emit('update_player_list', world);
    });

    // Создание объектов для игрока
    socket.on('create_player_object', function(data){
        var player = world.players[data._id];
        if(player){
            createShip(player, data.shipType);
        }
    });

    //Прием команды от игрока
    socket.on('command', function(data){
        //var player = _.findWhere(players, {_id: data.player_id});
        var player = world.players[data.player_id];
        var command =  data.command.split(' ', 2);
        if(command[0].toUpperCase() == 'НАПРАВЛЕНИЕ'){
            player.ship.forEach(function(obj){
                var value = parseInt(command[1]);
                if(obj.type == 'canon'){
                    if(value < obj.min_angle){
                        value = obj.min_angle;
                    }else if(value > obj.max_angle){
                        value = obj.max_angle;
                    }
                    obj.given_direction = value - obj.delta_direction;
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
            socket.emit('messages', {show: true, color: '', strong: 'Перезарядка', span: ''});
            player.ship.forEach(function(obj){
                if(obj.type == 'canon' && obj.status){
                    var dy;
                    if(obj.reload_counter <= 0){
                        obj.reload_counter = obj.reload;
                        dy = opt.barrelLength;
                        obj.barrels.forEach(function(dx){
                            var c = Math.sqrt(dx*dx + dy*dy);
                            var alfa = obj.direction * Math.PI / 180;
                            var beta = Math.asin(dy/c);
                            var ammo = {
                                type: 'ammo',
                                x: obj.x + c * Math.sin((dx > 0 ? (Math.PI/2 - beta) : (beta - Math.PI/2)) + alfa),
                                y: obj.y - c * Math.cos((dx > 0 ? (Math.PI/2 - beta) : (beta - Math.PI/2)) + alfa),
                                direction: obj.direction + utils.getRandom(0.5, 100),
                                ammo_speed: obj.ammo_speed,
                                distance: player.distance + utils.getRandom(player.distance, 0.5),
                                distance_counter: 0
                            };
                            player.ship.push(ammo);
                        });
                    }else{
                        socket.emit('messages', {show: true, color: '', strong: 'Орудия перезаряжаются', span: ''});
                    }
                }
            });
        }
    });

    // Выкидываем игрока на начальный экран
    // по кнопке
    socket.on('leave_battle', function(){
        kickPlayer(socket._id);
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

/**
 * События
 *
 * Сообщение
 * messages  server -> client
 * .emit('messages', {show: true, color: 'alert-info', strong: 'Орудия заряжены', span: ''})
 *
 * show         |   boolean     |   true/false                              |   Видимость сообщения
 * color        |   string      |   alert-success  alert-error  alert-info  |   Цвет сообщения
 * strong       |   string      |                                           |   Текст который нужно написать жирным
 * span         |   string      |                                           |   Текст который нужно написать обычным шрифтом
 *
 *
 * Перенаправление игрока на стартовый экран
 * to_start_screen  server -> client
 * .emit('to_start_screen', world)
 *
 * world        |   Object      |    world                                  |   Объект с настройками игрового поля
 *
 *
 * Отправка игровых данных на клиент в каждый тик сервера
 * gamedata     server -> client
 * .emit('gamedata', {options: opt, world: world, players: players})
 *
 * options      |   Object      |   opt                                     |   Объект с настройками сервера
 * world        |   Object      |   world                                   |   Объект с настройками игрового поля
 * players      |   Array       |   players                                 |   Список объектов игроков
 *
 *
 * Отправка стартовых данных при инициализации нового игрока
 * options      server -> client
 * .emit('options', {options: opt, world: world, templates: shipsTemplates, player_id: socket.id})
 *
 * options      |   Object      |   opt                                     |   Объект с настройками сервера
 * world        |   Object      |   world                                   |   Объект с настройками игрового поля
 * templates    |   Array       |   shipsTemplates                          |   Список объектов шаблонов кораблей
 * player_id    |   String      |   socket.id                               |   id текущего игрока
 *
 *
 * Запрос на создание нового игрока
 * new_player   client -> server
 * .emit('new_player', { nickName: 'Evan', side: 'leaf', _id: '' })
 *
 * nickName     |   String      |   'Evan'                                  |   Имя пользователя
 * side         |   String      |   'leaf'/'fire'                           |   Выбранная сторона
 * _id          |   String      |   ''                                      |   Место под id пользователя
 *
 *
 * Запрос на создание игровых объектов для конкретного игрока
 * create_player_object client -> server
 * .emit('create_player_object', {parent_id: itIsYou._id, ship_type: shipType})
 *
 * parent_id    |   String      |   itIsYou._id                             |   id Игрока
 * ship_type    |   String      |   shipTemplates.kind                      |   Тип выбранного корабля
 *
 *
 * Отправка комманд управления
 * command  client -> server
 * .emit('command', {command: command, player_id: itIsYou._id})
 *
 * command      |   String      |   ''                                      |   Команда от игрока
 * player_id    |   String      |   itIsYou._id                             |   id текущего игрока
 */
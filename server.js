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
var bots = require('./bots');

var app = express();
var server = http.createServer(app);

/**
 * Игровые переменные
 */

var intId = null;
var io;

var grid = utils.extend({}, defaultGrid, true);

var world = {
    battle: {
        status: 'wait' // Возможные варианты: wait  start  end
    },

    players: {},    // словарь ключи = id-шники
    lobby: [],      // список id игроков в лобби
    inBattle: [],   // список id игроков в битве
    disconected: [],// список id игроков выкинутых по дисконнекту

    windForce: null,
    endCounter: opt.defaultEndCounter,   // ms милисекунды
    windCounter: opt.defaultWindCounter,   // ms милисекунды
    resources: {
        leaf: 15,
        fire: 15
    }
};

function addBotToLobby(){
    bots.forEach(function(bot){
        world.lobby.push(bot._id);
    });
    io.emit('update_player_list', world);
}

function log(a, b){
    io.emit('logging', {a:a, b:b});
}

function canonLauncherCalc(obj, player){
    var delta = null, playerSocket;
    if(obj.status){
        player.isDefeat = false;
        delta = obj.given_direction - obj.direction;
        if(delta){
            var trueAngleSpeed = obj.angle_speed*(opt.delay/1000);
            if(Math.abs(delta) > trueAngleSpeed){
                obj.direction = obj.direction + utils.markOfNumber(delta)*trueAngleSpeed;
            }else{
                obj.direction = obj.given_direction;
            }
        }
        if(obj.reload_counter > 0){
            obj.reload_counter -= opt.delay;
            if(obj.reload_counter <= 0){
                playerSocket = io.to(player._id);
                if(playerSocket){
                    if(obj.type == 'canon'){
                        playerSocket.emit('messages', {show: true, color: 'alert-info', strong: 'Орудия заряжены', span: ''});
                    }else if(obj.type == 'launcher'){
                        playerSocket.emit('messages', {show: true, color: 'alert-info', strong: 'Торпеды загружены', span: ''});
                    }
                }
            }
        }
    }
}

function torpedoCalc(torpedo, player){
    var angle = torpedo.direction*Math.PI/180;
    var delta = torpedo.distance - torpedo.distance_counter;
    var trueAmmoSpeed = torpedo.ammo_speed*opt.delay/1000;

    if(delta > trueAmmoSpeed){
        torpedo.x = torpedo.x + Math.sin(angle)*trueAmmoSpeed;
        torpedo.y = torpedo.y - Math.cos(angle)*trueAmmoSpeed;
        torpedo.distance_counter = torpedo.distance_counter + trueAmmoSpeed;

        //todo: Провека столкновений торпед
    }else{
        torpedo.type = 'miss';
        torpedo.reload = opt.missLifeTime;
        torpedo.reload_counter = 0;
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
            var vir_x, vir_y, isMiss = true, t_player = world.players[id];

            t_player.ship.forEach(function(target){
                var target_range = null;

                if(target.type == 'canon'){
                    if(player.side != t_player.side){
                        vir_x = opt.width - target.x;
                        vir_y = opt.height - target.y;
                    }else{
                        vir_x = target.x;
                        vir_y = target.y;
                    }

                    target_range = Math.sqrt(Math.pow(vir_x - ammo.x, 2) + Math.pow(vir_y - ammo.y, 2));
                    if(target_range < opt.canonRadius){ //todo: canonRadius перенести из глобальных опций в снаряды
                        target.status = false;
                        isMiss = false;
                    }
                }
            });

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

function startBattle(){
    var side = {leaf: 0, fire: 0}, temp = [];
    world.inBattle = [];
    world.lobby.forEach(function(id){
        var player = world.players[id];
        //todo: Написать функцию распределения игроков по точкам сетки (или даже отказаться от сетки)
        //в зависимости от типа корабля (торпедоносцы вперед). Или дать игрокам самим выбирать.
        var grid_cell = _.findWhere(grid, {side: player.side, is_free: true});

        if(side[player.side]<6 && grid_cell){
            side[player.side]++;
            world.inBattle.push(id);

            grid_cell.is_free = false;
            grid_cell.child_id = player._id;
            player.x = grid_cell.x;
            player.y = grid_cell.y;
            player.distance = 300;
            player.ship = [];
            player.isDefeat = false;
            createShip(player);
        }else{
            temp.push(id);
            io.to(id).emit('messages', {show: true, color: 'alert-error', strong: 'Для тебя нет места.', span: ''});
        }
    });
    world.lobby = temp;

    world.battle.status = 'start';
    world.endCounter = opt.defaultEndCounter;
    world.windCounter = opt.defaultWindCounter;
    world.windForce = _.random(-opt.maxWind, opt.maxWind, true);

    io.emit('update_player_list', world);
    io.emit('messages', {show: true, color: 'alert-success', strong: 'Битва началась', span: ''});
    io.emit('show_battle_screen');

    intId = setInterval(gameCycle, opt.delay);
}

function gameCycle(){
    var alive = {leaf: 0, fire: 0};
    if(world.inBattle.length){
        world.inBattle.forEach(function(id){
            var deleteList = [], player = world.players[id];
            if(player && player.ship.length){
                player.isDefeat = true;
                player.ship.forEach(function(obj, index){
                    if(obj.type == 'canon' || obj.type == 'launcher'){
                        canonLauncherCalc(obj, player);
                    }else if(obj.type == 'ammo'){
                        ammoCalc(obj, player);
                    }else if(obj.type == 'torpedo'){
                        torpedoCalc(obj, player);
                    }else if(obj.type == 'miss'){
                        missCalc(obj, index, deleteList);
                    }
                });

                alive[player.side] += (!player.isDefeat ? 1 : 0);

                deleteList.forEach(function(obj_index, index){
                    player.ship.splice(obj_index - index, 1);
                });
            }
        });

        if(world.battle.status === 'start'){
            world.battle.status = (alive.leaf && alive.fire) ? 'start' : 'end';
        }

        if(world.battle.status === 'end'){
            world.endCounter = world.endCounter - opt.delay;
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
    }

    // Смена направление и силы ветра по времени
    world.windCounter -= opt.delay;
    if(world.windCounter <= 0){
        world.windCounter = opt.defaultWindCounter;
        world.windForce = _.random(-opt.maxWind, opt.maxWind, true);
    }

    // Отправка игровых данных на клиент
    io.emit('gamedata', {options: opt, world: world});
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

    world.inBattle.forEach(function(id){
        io.to(id).emit('to_start_screen', world);
    });
    deleteDisconnected();
    clearInterval(intId);
    addBotToLobby(); //todo: Убрать когда боты будут добавляться руками
    world.inBattle = [];
    world.battle.status = 'wait';

    grid = utils.extend({}, defaultGrid, true);
}

function deleteDisconnected(){
    world.disconected.forEach(function(id){
        if(world.players[id]){
            delete world.players[id];
        }
    });
    world.disconected = [];
}

function createShip(player){
    player.ship = [];
    var template = _.findWhere(shipsTemplates, {kind: player.shipType});
    template.objects.forEach(function(obj){
        var resources = 0;
        var newObj = {
            type: obj.type,
            x: player.x + obj.dx,
            y: player.y + obj.dy
        };
        if(obj.type == 'canon' || obj.type == 'launcher'){
            newObj.direction = obj.direction;
            newObj.given_direction = obj.direction;
            newObj.delta_direction = 0;
            newObj.angle_speed = 20;
            newObj.ammo_speed = obj.ammo_speed || opt.ammoSpeed;
            newObj.reload = obj.reload;
            newObj.reload_counter = 0;
            newObj.status = true;
            if(obj.type == 'canon'){
                newObj.kind = obj.kind;
            }else{
                newObj.cone = 10;
            }
            newObj.range = obj.range || 1300;
            newObj.barrels = obj.barrels;
            newObj.min_angle = obj.angles[0];
            newObj.max_angle = obj.angles[1];
            resources += obj.barrels.length;
        }else if(obj.type == 'hull'){
            //newObj.kind = player.shipType;
            newObj.direction = 0;
        }
        world.resources[player.side] -= resources;
        player.ship.push(newObj);
    });
    io.emit('buttons', world);
}

function kickPlayer(player_id){
    var player = world.players[player_id];
    if(player && player.ship && player.ship.length){
        player.ship.forEach(function(obj){
            if((obj.type == 'canon' || obj.type == 'launcher') && obj.status){
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
    socket.emit('options', {options: opt, world: world, templates: shipsTemplates, player_id: socket.id});

    // Создание нового игрока
    socket.on('new_player', function(data){
        if(!data.nickName){
            data.nickName = 'Captain' + socket.id;
            socket.emit('set_name', data.nickName);
        }
        data._id = socket.id;
        world.players[data._id] = data;
        io.emit('messages', {show: true, color: 'alert-info', strong: 'Игрок ' + data.nickName + ' входит в игру', span: ''});
        io.emit('update_player_list', world);
    });

    socket.on('set_ship_type', function(type){
        world.players[socket.id].shipType = type;
    });

    socket.on('to_lobby', function(){
        world.lobby.push(socket.id);
        io.emit('update_player_list', world);
    });

    socket.on('to_battle', function(){
        var alive = {leaf: 0, fire: 0};
        if(world.battle.status === 'start'){
            socket.emit('messages', {show: true, color: '', strong: 'Бой уже начался', span: ''});
        }else if(world.lobby.length <= 1){
            socket.emit('messages', {show: true, color: '', strong: 'Мало игроков', span: ''});
        }else{
            world.lobby.forEach(function(id){
                alive[world.players[id].side] += 1;
            });
            if(!alive.leaf || !alive.fire){
                socket.emit('messages', {show: true, color: '', strong: 'Ждем противников', span: ''});
            }else{
                startBattle();
            }
        }
    });

    //Прием команды от игрока
    socket.on('command', function(data){
        var player = world.players[data.player_id];
        var command =  data.command.split(' ', 2);
        if(command[0].toUpperCase() == 'НАПРАВЛЕНИЕ'){
            player.ship.forEach(function(obj){
                var value = parseInt(command[1]);
                if(obj.type == 'canon' || obj.type == 'launcher'){
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
            var shot = false;
            player.ship.forEach(function(obj){
                if(obj.type == 'canon' && obj.status && player.distance <= obj.range ){
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
                                kind: obj.kind,
                                x: obj.x + c * Math.sin((dx > 0 ? (Math.PI/2 - beta) : (beta - Math.PI/2)) + alfa),
                                y: obj.y - c * Math.cos((dx > 0 ? (Math.PI/2 - beta) : (beta - Math.PI/2)) + alfa),
                                direction: obj.direction + utils.getRandom(0.5, 100),
                                ammo_speed: obj.ammo_speed,
                                distance: player.distance + utils.getRandom(player.distance, 0.5),
                                distance_counter: 0
                            };
                            player.ship.push(ammo);
                            shot = true;
                        });
                    }else{
                        socket.emit('messages', {show: true, color: '', strong: 'Орудия перезаряжаются', span: ''});
                    }
                }
            });
            if(shot){
                socket.emit('messages', {show: true, color: '', strong: 'Перезарядка', span: ''});
            }
        }else if(command[0].toUpperCase() == 'ПУСК'){
            var shot = false;
            player.ship.forEach(function(obj){
                if(obj.type == 'launcher' && obj.status){
                    var dy, ha, da;
                    if(obj.reload_counter <= 0){
                        obj.reload_counter = obj.reload;
                        dy = opt.barrelLength;

                        ha = obj.barrels.length > 1 ? (obj.cone / 2) : 0;
                        da = obj.barrels.length > 1 ? (obj.cone / (obj.barrels.length - 1)) : 0;
                        obj.barrels.forEach(function(dx, index){
                            var c = Math.sqrt(dx*dx + dy*dy);
                            var alfa = obj.direction * Math.PI / 180;
                            var beta = Math.asin(dy/c);
                            var torpedo = {
                                type: 'torpedo',
                                x: obj.x + c * Math.sin((dx > 0 ? (Math.PI/2 - beta) : (beta - Math.PI/2)) + alfa),
                                y: obj.y - c * Math.cos((dx > 0 ? (Math.PI/2 - beta) : (beta - Math.PI/2)) + alfa),
                                direction: obj.direction + ha - index*da,
                                ammo_speed: obj.ammo_speed,
                                distance: obj.range,// + utils.getRandom(player.distance, 0.5),
                                distance_counter: 0
                            };
                            player.ship.push(torpedo);
                            shot = true;
                        });
                    }else{
                        socket.emit('messages', {show: true, color: '', strong: 'ТА перезаряжаютя', span: ''});
                    }
                }
            });
            if(shot){
                socket.emit('messages', {show: true, color: '', strong: 'Идет перезарядка ТА', span: ''});
            }
        }
    });

    // Выкидываем игрока на начальный экран
    // по кнопке
    socket.on('leave_battle', function(){
        kickPlayer(socket.id);
    });
    // по дисконнекту
    socket.on('disconnect', function(){
        kickPlayer(socket.id);
        world.disconected.push(socket.id);
    });
});

//todo: Добавление ботов в очередь по желанию игрока.
bots.forEach(function(bot){
    world.players[bot._id] = bot;
});
addBotToLobby();

/**
 * Модель player (Игрок)
 *
 * _id
 * nickName
 * side
 * shipType
 * -------------- На этапе добавления игрока в world.players
 * -------------- При попадании в очередь только добавляется значение shipType
 * x
 * y
 * distance
 * isDefeat
 * ship []
 * -------------- Добавляются на этапе startBattle
 * ship [
 *      ... //Список объектов игрока (корпус пушки снаряды)
 * ]
 * -------------- Заполняется в фции createShip
 */

/**
 * Игровой объект
 *
 * type                 // hull canon ammo miss
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
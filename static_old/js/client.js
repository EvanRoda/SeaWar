var socket = io.connect();
var itIsYou = {
    nickName: '',
    side: 'leaf',
    shipType: '',
    _id: ''
};

var ui = {
    modal: {
        login: $('#login_modal'),
        ship: $('#ship_modal'),
        help: $('#help'),
        gameOver: $('#game_over')
    },
    buttons: {
        leaf: $('#leaf_button'),
        fire: $('#fire_button'),
        toBattle: $('#to_battle'),
        readyToggle: $('#ready_toggle')
    },
    screen: {
        battle: $('#battle_screen'),
        lobby: $('#lobby')
    },
    //params: $('#params'), todo: Выпилить когда переделаешь худ
    commandField: $('#command_line'),
    messageBox: $('.message-block'),
    endMessage: $('#end_message'),
    youResources: $('#command_resource'),
    shipContainer: $('#ship_container'),
    allPlayers: $('#all_players'),
    lobbyPlayers: $('#lobby_players'),
    battlePlayers: $('#battle_players'),
    showNick: $('#show_nick'),
    showShip: $('#show_ship'),
    gameField: $('#game_field'),

    render: function(player, where){
        var fn='', onclick = '';
        if(player.is_bot){
            fn = "addBot('" + player._id + "')";
            onclick = 'onclick="' + fn + '" class="sim_link"';
        }

        if(player._id === itIsYou._id){
            where.append('<div style="color: #c67605"><h4>'+ player.nickName +'</h4></div>')
        }else if(player.side === 'leaf'){
            where.append('<div '+ (player.is_bot && where[0].id == 'all_players' ? onclick : '') + ' style="color: #39b25a"><h4>'+ player.nickName +'</h4></div>')
        }else{
            where.append('<div '+ (player.is_bot && where[0].id == 'all_players' ? onclick : '') + ' style="color: #b21c1f"><h4>'+ player.nickName +'</h4></div>')
        }
    },

    renderButtons: function(option){
        world_opt = option;
        ui.buttons.leaf.html('<i class="icon-eye-open icon-white"></i> Leaf ' + world_opt.resources.leaf);
        ui.buttons.fire.html('<i class="icon-eye-close icon-white"></i> Fire ' + world_opt.resources.fire);
        ui.youResources.html(option.resources[itIsYou.side]);
        ui.shipContainer.html('');
        templates.forEach(function(template){
            if(template.cost <= option.resources[itIsYou.side]){
                var fn = "setShipType('" + template.kind + "')";
                ui.shipContainer.append('<button onclick="'+ fn +'" class="btn relative-width-100">' + template.name + ' ' + template.cost + '</button>');
            }
        });
    },

    renderLobby: function(lists){
        world_opt = lists;
        ui.allPlayers.html('');
        ui.lobbyPlayers.html('');
        ui.battlePlayers.html('');

        for(var key in lists.players){
            if(lists.players.hasOwnProperty(key)){
                ui.render(lists.players[key], ui.allPlayers);
            }
        }

        lists.lobby.forEach(function(id){
            ui.render(lists.players[id], ui.lobbyPlayers);
        });

        lists.inBattle.forEach(function(id){
            ui.render(lists.players[id], ui.battlePlayers);
        });
    },

    renderNick: function(name){
        itIsYou.nickName = name || itIsYou.nickName;
        ui.showNick.html(itIsYou.nickName);
    },

    renderReady: function(ready){
        var is_ready = '<button class="btn btn-success btn-large relative-width-100" type="button" onclick="toBattle()"><i class="fa fa-check-circle-o"></i> Готов</button>';
        var not_ready= '<button class="btn btn-warning btn-large relative-width-100" type="button" onclick="toBattle()"><i class="fa fa-circle-o"></i> Не готов</button>';
        ui.buttons.readyToggle.html(ready ? is_ready : not_ready);
    },

    renderShipLabel: function(shipType){
        var ship = findWhere(templates, {kind: shipType});
        itIsYou.shipType = shipType;
        ui.renderReady(false);
        toLobby();
        ui.showShip.html(ship ? ship.name : '(корабель)');
    },

    renderMessage: function(data){
        if(data.show){
            ui.messageBox.show().removeClass().addClass('alert message-block small-alert ' + data.color);
            ui.messageBox.find('strong').html(data.strong);
            ui.messageBox.find('span').html(data.span);
        }else{
            ui.messageBox.hide();
        }
    },

    showEndMessage: function(data){
        if(data.resources[itIsYou.side] > 0){
            ui.endMessage.html('Ваша команда победила!');
        }else{
            ui.endMessage.html('Ваша команда проиграла!');
        }
        ui.modal.gameOver.modal('show');
    },

    toBattleScreen: function(){
        ui.buttons.toBattle.hide();
        ui.screen.battle.show();
        ui.screen.lobby.hide();
        ui.commandField.focus();

        var player = world_opt.players[itIsYou._id];
        aim.grid = {x: player.x, y: player.y};
        aim.cross = {x: player.x+100, y: player.y};
        aim.reduction = {x: player.x, y: player.y};
    }
};

var aim = {
    realRange: 1000,
    sightRange: 400,

    grid: {x:0, y:0},
    cross: {x: 0, y:0},
    reduction: {x: 0, y:0},

    mouseDown: function(event){
        ui.gameField.off('mousedown');
        var player = world_opt.players[itIsYou._id];
        var l = Math.sqrt(Math.pow(player.x - event.offsetX, 2) + Math.pow(player.y - event.offsetY, 2));

        if(event.button == 0){
            if(l < aim.sightRange){
                aim.cross.x = event.offsetX;
                aim.cross.y = event.offsetY;
            }else{
                //Адов расчет с тангенсами и прочей ...той
            }
            ui.gameField.on('mousemove', aim.moveCross);
            ui.gameField.on('mouseup', aim.sendCross);
        }else if(event.button == 2){
            aim.reduction.x = l > aim.sightRange ? aim.sightRange : l;
            ui.gameField.on('mousemove', aim.moveReduction);
            ui.gameField.on('mouseup', aim.sendReduction);
        }
        event.preventDefault();
    },

    moveCross: function (event){
        var player = world_opt.players[itIsYou._id];
        var l = Math.sqrt(Math.pow(player.x - event.offsetX, 2) + Math.pow(player.y - event.offsetY, 2));

        if(l <= aim.sightRange){
            aim.cross.x = event.offsetX;
            aim.cross.y = event.offsetY;
        }else{
            //Адов расчет с тангенсами и прочей ...той
        }

        event.preventDefault();
    },

    moveReduction: function (event){
        event.preventDefault();
        var player = world_opt.players[itIsYou._id];
        var l = Math.sqrt(Math.pow(player.x - event.offsetX, 2) + Math.pow(player.y - event.offsetY, 2));
        aim.reduction.x = l > aim.sightRange ? aim.sightRange : l + player.x;
    },

    sendCross: function(event){
        ui.gameField.off('mousemove');
        ui.gameField.off('mouseup');

        var player = world_opt.players[itIsYou._id],
            ab = event.offsetX - player.x,
            bc = player.y - event.offsetY,
            angle, commandAngle, commandRange,
            tan = ab != 0 ? bc / ab : Math.Pi/2,
            l = Math.sqrt(Math.pow(ab, 2) + Math.pow(bc, 2));

        angle = Math.atan(Math.abs(tan)) * 180 / Math.PI;
        angle = tan > 0 ? 90 - angle : angle + 90;

        if(l <= aim.sightRange){
            aim.cross.x = event.offsetX;
            aim.cross.y = event.offsetY;

        }else{
            l = aim.sightRange;
        }

        commandRange = 'дальность ' + (l * aim.realRange / aim.sightRange);
        commandAngle = 'направление ' + angle;

        socket.emit('command', {command: commandRange});
        socket.emit('command', {command: commandAngle});
        ui.messageBox.hide();
        ui.gameField.on('mousedown', aim.mouseDown);

        event.preventDefault();
    },

    sendReduction: function (event){
        event.preventDefault();
        ui.gameField.off('mousemove');
        ui.gameField.off('mouseup');
        var command;
        var player = world_opt.players[itIsYou._id];
        var l = Math.sqrt(Math.pow(player.x - event.offsetX, 2) + Math.pow(player.y - event.offsetY, 2));
        aim.reduction.x = l > aim.sightRange ? aim.sightRange : l + player.x;

        command = aim.reduction.x * aim.realRange / aim.sightRange;
        command = 'сведение ' + command;

        socket.emit('command', {command: command});
        ui.messageBox.hide();

        ui.gameField.on('mousedown', aim.mouseDown);


    }
};

var windMarks = [];
var sightElements = [];
var hulls = [];
var canons = [];
var launchers = [];
var floors = [];
var bullets = [];
var torpedos = [];
var misses = [];
var flags = [];
var renderer = null;

var skins = {};

var sight = {
    grid: new Image(),
    cross: new Image(),
    reduction: new Image()
};

sight.grid.src = 'images/sight/grid.png';
sight.cross.src = 'images/sight/cross.png';
sight.reduction.src = 'images/sight/reduction.png';

var flag = {
    you: new Image(),
    friend: new Image(),
    enemy: new Image()
};

flag.you.src = 'images/flags/flag_you.png';
flag.friend.src = 'images/flags/flag_friend.png';
flag.enemy.src = 'images/flags/flag_enemy.png';

var damagedCanon = new Image();
damagedCanon.src = 'images/damagedCanon.png';

var miss = {
    main: new Image(),
    second: new Image(),
    torpedo: new Image()
};
miss.main.src = 'images/miss.png';
miss.second.src = 'images/miss.png';
miss.torpedo.src = 'images/t_boom.png';

var ammo = {
    main: new Image(),
    second: new Image()
};
ammo.main.src = 'images/ammo/main.png';
ammo.second.src = 'images/ammo/second.png';
var torpedo = new Image();
torpedo.src = 'images/ammo/torpedo.png';
var wind_center = new Image();
wind_center.src = 'images/wind_center.png';
var wind = new Image();
wind.src = 'images/wind.png';

var world = Physics();
var world_opt = {};
var templates = [];

socket.on('options', createWorld);

socket.on('buttons', ui.renderButtons);

socket.on('update_player_list', ui.renderLobby);

socket.on('gamedata', gameTick);

socket.on('to_start_screen', onStart);

socket.on('show_battle_screen', ui.toBattleScreen);

socket.on('messages', ui.renderMessage);

socket.on('set_name', ui.renderNick);

socket.on('set_ship_tipe', ui.renderShipLabel);

socket.on('set_ready', ui.renderReady);

socket.on('game_over', ui.showEndMessage);

socket.on('logging', function(data){
    console.log(data.a, data.b);
});

function onStart(data){
    ui.showShip.html('(корабель)');
    ui.renderButtons(data);
    ui.renderLobby(data);
    ui.messageBox.hide();
    //ui.modal.login.modal('show');
    ui.modal.ship.modal('hide');
    ui.buttons.toBattle.hide();
    ui.screen.battle.hide();
    ui.screen.lobby.show();

    ui.gameField.on('mousedown', aim.mouseDown);
    ui.gameField.on('contextmenu', function(event){
         event.preventDefault();
    });
}

function createWorld(data){
    itIsYou._id = data.player_id;
    templates = data.templates;
    templates.forEach(function(template){
        skins[template.kind] = {hull: new Image(), canons: {}};
        skins[template.kind].hull.src = 'images/hulls/' + template.hull_img;
        template.objects.forEach(function(obj){
           if(obj.type == 'canon'){
               skins[template.kind].canons[obj.kind] = new Image();
               skins[template.kind].canons[obj.kind].src = 'images/canons/' + obj.img;
           }else if(obj.type == 'launcher'){
               skins[template.kind].launcher = new Image();
               skins[template.kind].launcher.src = 'images/launchers/' + obj.img;
           }else if(obj.type == 'floor'){
               skins[template.kind].floor = new Image();
               skins[template.kind].floor.src = 'images/floors/' + obj.img;
           }
        });
    });

    renderer = Physics.renderer('canvas', {
        el: 'game_field',
        width: data.options.width,
        height: data.options.height,
        meta: false, // don't display meta data
        styles: {
            'circle' : {
                strokeStyle: '#351024',
                lineWidth: 1,
                fillStyle: '#d33682',
                angleIndicator: '#351024'
            }
        }
    });

    world.add( renderer );
    onStart(data.world);
}

function gameTick(data){
    var dist, dir;
    var players = data.world.inBattle;
    var opt = data.options;
    world_opt = data.world;
    if(windMarks.length){world.remove(windMarks);}
    if(sightElements.length){world.remove(sightElements);}
    if(hulls.length){world.remove(hulls);}
    if(canons.length){world.remove(canons);}
    if(launchers.length){world.remove(launchers);}
    if(floors.length){world.remove(floors);}
    if(bullets.length){world.remove(bullets);}
    if(torpedos.length){world.remove(torpedos);}
    if(misses.length){world.remove(misses);}
    if(flags.length){world.remove(flags);}
    windMarks = [];
    sightElements = [];
    hulls = [];
    canons = [];
    launchers = [];
    floors = [];
    bullets = [];
    torpedos = [];
    misses = [];
    flags = [];

    var newObject = createObject(wind_center, [477, 730]);
    windMarks.push(newObject);

    if(world_opt.windForce){
        var repeat = Math.floor(4 - Math.abs(opt.maxWind/world_opt.windForce));
        var direct = itIsYou.side == 'leaf' ? markOfNumber(world_opt.windForce) : -1 * markOfNumber(world_opt.windForce);
        for(var i = 1; i <= repeat; i++){
            newObject = createObject(wind, [477, 730 + direct*12*i]);
            newObject.state.angular.pos = direct < 0 ? 0 : Math.PI;
            windMarks.push(newObject);
        }
    }

    newObject = createObject(sight.grid, [aim.grid.x, aim.grid.y]);
    sightElements.push(newObject);
    newObject = createObject(sight.cross, [aim.cross.x, aim.cross.y]);
    sightElements.push(newObject);
    newObject = createObject(sight.reduction, [aim.reduction.x, aim.reduction.y]);
    sightElements.push(newObject);

    if(players.length){
        players.forEach(function(id){
            var player = world_opt.players[id];
            player.ship.forEach(function(obj){
                //Переворачиваем координаты для противников
                if(itIsYou.side != player.side){
                    obj.x = opt.width - obj.x;
                    obj.y = opt.height - obj.y;
                    obj.direction = obj.direction - 180;
                }

                //Рисуем
                newObject = createObject(false, [obj.x, obj.y]);

                if(obj.type == 'canon'){
                    if(player._id == itIsYou._id){
                        dist = player.distance;
                        dir = obj.given_direction + obj.delta_direction;
                    }
                    if(obj.status){
                        newObject.view = skins[player.shipType].canons[obj.kind];
                    }else{
                        newObject.view = damagedCanon;
                    }
                    newObject.state.angular.pos = Math.PI*obj.direction/180;
                    canons.push(newObject);
                }else if(obj.type == 'launcher'){
                    if(player._id == itIsYou._id){
                        dir = obj.given_direction + obj.delta_direction;
                    }
                    if(obj.status){
                        newObject.view = skins[player.shipType].launcher;
                    }else{
                        newObject.view = damagedCanon;
                    }
                    newObject.state.angular.pos = Math.PI*obj.direction/180;
                    launchers.push(newObject);
                }else if(obj.type == 'hull'){
                    newObject.view = skins[player.shipType].hull;
                    newObject.state.angular.pos = Math.PI*obj.direction/180;
                    hulls.push(newObject);
                }else if(obj.type == 'floor'){
                    newObject.view = skins[player.shipType].floor;
                    newObject.state.angular.pos = Math.PI*obj.direction/180;
                    floors.push(newObject);
                }else if(obj.type == 'ammo'){
                    newObject.view = ammo[obj.kind];
                    newObject.state.angular.pos = Math.PI*obj.direction/180;
                    bullets.push(newObject);
                }else if(obj.type == 'torpedo'){
                    newObject.view = torpedo;
                    newObject.state.angular.pos = Math.PI*obj.direction/180;
                    torpedos.push(newObject);
                }else if(obj.type == 'miss'){
                    newObject.view = miss[obj.kind];
                    newObject.state.angular.pos = Math.PI*(0)/180;
                    misses.push(newObject);
                }else if(obj.type == 'flag'){
                    if(player._id == itIsYou._id){
                        newObject.view = flag.you;
                    }else{
                        if(player.side == itIsYou.side){
                            newObject.view = flag.friend;
                        }else{
                            newObject.view = flag.enemy;
                        }
                    }
                    flags.push(newObject);
                }
            });
        });
        //todo: Переделать худ
        //ui.params.html('Дал.: ' + dist + ' Нап.: ' + dir + ' Рес.: ' + world_opt.resources[itIsYou.side]);
    }
    if(windMarks.length){world.add(windMarks);}
    if(sightElements.length){world.add(sightElements);}
    if(misses.length){world.add(misses);}
    if(torpedos.length){world.add(torpedos);}
    if(hulls.length){world.add(hulls);}
    if(flags.length){world.add(flags);}
    if(canons.length){world.add(canons);}
    if(launchers.length){world.add(launchers);}
    if(floors.length){world.add(floors);}
    if(bullets.length){world.add(bullets);}
    world.render();
}

function openHelp(){
    ui.modal.help.modal('show');
}

function openLogin(){
    ui.modal.login.modal('show');
}

function openSelectShipWindow(){
    socket.emit('drop_ship_type');

    ui.modal.ship.modal('show');
}

function setShipType(shipType){
    itIsYou.shipType = shipType;
    socket.emit('send_ship_type', shipType);
    ui.modal.ship.modal('hide');
}

function selectSide(side){
    var name = $('#player_name');
    ui.modal.login.modal('hide');
    socket.emit('new_player', {nickName: name.val(), side: side});
}

function toLobby(){
    var sending = true;
    world_opt.lobby.forEach(function(id){
        if(itIsYou._id == id){
            sending = false;
        }
    });
    if(sending){
        socket.emit('to_lobby');
        ui.buttons.toBattle.show();
        if(!itIsYou.shipType){
            ui.modal.ship.modal('show');
        }
    }
}

function toBattle(){
    socket.emit('to_battle');
}

function leaveBattle(){
    socket.emit('leave_battle');
}

function addBot(bot_id){
    socket.emit('add_bot_to_lobby', bot_id);
}

function markOfNumber(number){
    return number<0 ? -1 : 1;
}

function findWhere(arr, params){
    var element = null;
    arr.forEach(function(el){
        var check = true;
        for(var key in params){
            if(check && params.hasOwnProperty(key) && el.hasOwnProperty(key)){
                check = params[key] === el[key];
            }else{
                check = false;
            }
        }
        if(check){
            element = el;
        }
    });
    return element;
}

function createObject(image, coord){
    var newObject = Physics.body('circle', {
        mass: 100,
        radius: 2,
        x: coord[0],
        y: coord[1]
    });
    if(image){
        newObject.view = image;
    }
    return newObject;
}

ui.commandField.keydown(function(event){
    if (event.which == 13){
        var command = ui.commandField.val();
        if(command){
            socket.emit('command', {command: command});
            ui.messageBox.hide();
        }
        ui.commandField.val('').focus();
    }else if(event.which == 32){
        socket.emit('command', {command: 'огонь'});
        ui.messageBox.hide();
    }
});
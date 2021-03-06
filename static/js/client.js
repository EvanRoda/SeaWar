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
        ship: $('#ship_modal')
    },
    buttons: {
        leaf: $('#leaf_button'),
        fire: $('#fire_button'),
        toBattle: $('#to_battle')
    },
    screen: {
        battle: $('#battle_screen'),
        lobby: $('#lobby')
    },
    params: $('#params'),
    commandField: $('#command_line'),
    messageBox: $('#message'),
    shipContainer: $('#ship_container'),
    allPlayers: $('#all_players'),
    lobbyPlayers: $('#lobby_players'),
    battlePlayers: $('#battle_players'),
    showNick: $('#show_nick'),
    showShip: $('#show_ship'),

    render: function(player, where){
        if(player._id === itIsYou._id){
            where.append('<div style="color: #c67605"><h4>'+ player.nickName +'</h4></div>')
        }else if(player.side === 'leaf'){
            where.append('<div style="color: #39b25a"><h4>'+ player.nickName +'</h4></div>')
        }else{
            where.append('<div style="color: #b21c1f"><h4>'+ player.nickName +'</h4></div>')
        }
    },

    renderButtons: function(option){
        world_opt = option;
        ui.buttons.leaf.html('<i class="icon-eye-open icon-white"></i> Leaf ' + world_opt.resources.leaf);
        ui.buttons.fire.html('<i class="icon-eye-close icon-white"></i> Fire ' + world_opt.resources.fire);
        ui.shipContainer.html('');
        templates.forEach(function(template){
            if(template.side == itIsYou.side && template.cost <= option.resources[template.side]){
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

    renderShipLabel: function(){
        var ship = findWhere(templates, {side: itIsYou.side, kind: itIsYou.shipType});

        ui.showShip.html(ship ? ship.name : '(корабель)');
    },

    renderMessage: function(data){
        if(data.show){
            ui.messageBox.show().removeClass().addClass('alert ' + data.color);
            ui.messageBox.find('strong').html(data.strong);
            ui.messageBox.find('span').html(data.span);
        }else{
            ui.messageBox.hide();
        }
    },

    toBattleScreen: function(){
        ui.buttons.toBattle.hide();
        ui.screen.battle.show();
        ui.screen.lobby.hide();
        ui.commandField.focus();
    }
};

var windMarks = [];
var hulls = [];
var canons = [];
var bullets = [];
var misses = [];
var flags = [];
var renderer = null;

var skins = {
    leaf: {},
    fire: {}
};

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
var miss = new Image();
miss.src = 'images/miss.png';
var ammo = new Image();
ammo.src = 'images/ammo.png';
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

socket.on('logging', function(data){
    console.log(data.a, data.b);
});

function onStart(data){
    ui.showShip.html('(корабель)');
    ui.renderButtons(data);
    ui.renderLobby(data);
    ui.messageBox.hide();
    ui.modal.login.modal('show');
    ui.modal.ship.modal('hide');
    ui.buttons.toBattle.hide();
    ui.screen.battle.hide();
    ui.screen.lobby.show();
}

function createWorld(data){
    itIsYou._id = data.player_id;
    templates = data.templates;
    templates.forEach(function(template){
        skins[template.side][template.kind] = {hull: new Image(), canon: new Image()};
        skins[template.side][template.kind].hull.src = 'images/hulls/' + template.hull_img;
        skins[template.side][template.kind].canon.src = 'images/canons/' + template.canon_img;
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
    if(hulls.length){world.remove(hulls);}
    if(canons.length){world.remove(canons);}
    if(bullets.length){world.remove(bullets);}
    if(misses.length){world.remove(misses);}
    if(flags.length){world.remove(flags);}
    windMarks = [];
    hulls = [];
    canons = [];
    bullets = [];
    misses = [];
    flags = [];

    var newObject = Physics.body('circle', {
        mass: 100,
        radius: 2,
        x: 477,
        y: 730
    });
    newObject.view = wind_center;
    windMarks.push(newObject);

    if(world_opt.windForce){
        var repeat = Math.floor(4 - Math.abs(opt.maxWind/world_opt.windForce));
        var direct = itIsYou.side == 'leaf' ? markOfNumber(world_opt.windForce) : -1 * markOfNumber(world_opt.windForce);
        for(var i = 1; i <= repeat; i++){
            newObject = Physics.body('circle', {
                mass: 100,
                radius: 2,
                x: 477,
                y: 730 + direct*12*i
            });
            newObject.view = wind;
            newObject.state.angular.pos = direct < 0 ? 0 : Math.PI;
            windMarks.push(newObject);
        }
    }

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
                newObject = Physics.body('circle', {
                    mass: 100,
                    radius: 2,
                    x: obj.x,
                    y: obj.y
                });
                //console.log(newObject);
                if(obj.type == 'canon'){
                    if(player._id == itIsYou._id){
                        dist = player.distance;
                        dir = obj.given_direction + obj.delta_direction;
                    }
                    if(obj.status){
                        newObject.view = skins[player.side][obj.kind].canon;
                    }else{
                        newObject.view = damagedCanon;
                    }
                    newObject.state.angular.pos = Math.PI*obj.direction/180;
                    canons.push(newObject);
                }else if(obj.type == 'hull'){
                    newObject.view = skins[player.side][obj.kind].hull;
                    newObject.state.angular.pos = Math.PI*obj.direction/180;
                    hulls.push(newObject);
                }else if(obj.type == 'ammo'){
                    newObject.view = ammo;
                    newObject.state.angular.pos = Math.PI*obj.direction/180;
                    bullets.push(newObject);
                }else if(obj.type == 'miss'){
                    newObject.view = miss;
                    newObject.state.angular.pos = Math.PI*obj.direction/180;
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
        ui.params.html('Дал.: ' + dist + ' Нап.: ' + dir + ' Рес.: ' + world_opt.resources[itIsYou.side]);
    }
    if(windMarks.length){world.add(windMarks);}
    if(misses.length){world.add(misses);}
    if(hulls.length){world.add(hulls);}
    if(flags.length){world.add(flags);}
    if(canons.length){world.add(canons);}
    if(bullets.length){world.add(bullets);}
    world.render();
}

function openSelectShipWindow(){
    if(!world_opt.players[itIsYou._id].ship || !world_opt.players[itIsYou._id].ship.length){
        ui.modal.ship.modal('show');
    }
}

function setShipType(shipType){
    itIsYou.shipType = shipType;
    socket.emit('set_ship_type', shipType);
    ui.renderShipLabel();
    toLobby();
    ui.modal.ship.modal('hide');
}

function selectSide(side){
    var name = $('#player_name');
    itIsYou.nickName = name.val();
    itIsYou.side = side;
    ui.renderNick();
    ui.modal.login.modal('hide');
    socket.emit('new_player', itIsYou);
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

ui.commandField.keydown(function(event){
    if (event.which == 13){
        var command = ui.commandField.val();
        if(command){
            socket.emit('command', {command: command, player_id: itIsYou._id});
            ui.messageBox.hide();
        }
        ui.commandField.val('').focus();
    }
});
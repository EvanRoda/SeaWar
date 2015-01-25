var socket = io.connect();
var itIsYou = {
    nickName: '',
    side: 'leaf',
    shipType: '',
    _id: ''
};

var ui = {
    leafButton: $('#leaf_button'),
    fireButton: $('#fire_button'),
    params: $('#params'),
    commandField: $('#command_line'),
    messageBox: $('#message'),
    loginModal: $('#login_modal'),
    shipModal: $('#ship_modal'),
    shipContainer: $('#ship_container'),
    toBattle: $('#to_battle'),
    battleScreen: $('#battle_screen'),
    lobby: $('#lobby'),
    allPlayers: $('#all_players'),
    lobbyPlayers: $('#lobby_players'),
    battlePlayers: $('#battle_players'),
    showNick: $('#show_nick'),
    showShip: $('#show_ship')

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

ui.messageBox.hide();
ui.loginModal.modal('show');
ui.shipModal.modal('hide');
ui.toBattle.hide();
ui.battleScreen.hide();

socket.on('options', function(data){
    itIsYou._id = data.player_id;
    world_opt = data.world;
    templates = data.templates;
    templates.forEach(function(template){
        skins[template.side][template.kind] = {hull: new Image(), canon: new Image()};
        skins[template.side][template.kind].hull.src = 'images/hulls/' + template.hull_img;
        skins[template.side][template.kind].canon.src = 'images/canons/' + template.canon_img;
    });
    renderButtons(world_opt);
    renderLobby(world_opt);

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
});

socket.on('buttons', function(data){
    world_opt = data;
    renderButtons(world_opt);
});

socket.on('update_player_list', function(lists){
    world_opt = lists;
    renderLobby(lists);
});

socket.on('gamedata', function (data) {
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
});

socket.on('to_start_screen', function(data){
    world_opt = data;
    renderButtons(world_opt);
});

socket.on('show_battle_screen', function(){
    ui.toBattle.hide();
    ui.battleScreen.show();
    ui.commandField.focus();
});

socket.on('messages', function(data){
    if(data.show){
        ui.messageBox.show().removeClass().addClass('alert ' + data.color);
        ui.messageBox.find('strong').html(data.strong);
        ui.messageBox.find('span').html(data.span);
    }else{
        ui.messageBox.hide();
    }
});

socket.on('set_name', function(name){
    itIsYou.nickName = name;
    renderNick();
});

function renderButtons(option){
    ui.leafButton.html('<i class="icon-eye-open icon-white"></i> Leaf ' + world_opt.resources.leaf);
    ui.fireButton.html('<i class="icon-eye-close icon-white"></i> Fire ' + world_opt.resources.fire);
    ui.shipContainer.html('');
    templates.forEach(function(template){
        if(template.side == itIsYou.side && template.cost <= option.resources[template.side]){
            var fn = "setShipType('" + template.kind + "')";
            ui.shipContainer.append('<button onclick="'+ fn +'" class="btn relative-width-100">' + template.name + ' ' + template.cost + '</button>');
        }
    });
}

function renderLobby(lists){
    ui.allPlayers.html('');
    ui.lobbyPlayers.html('');
    ui.battlePlayers.html('');
    var render = function(player, where){
        if(player._id === itIsYou._id){
            where.append('<div style="color: #c67605"><h4>'+ player.nickName +'</h4></div>')
        }else if(player.side === 'leaf'){
            where.append('<div style="color: #39b25a"><h4>'+ player.nickName +'</h4></div>')
        }else{
            where.append('<div style="color: #b21c1f"><h4>'+ player.nickName +'</h4></div>')
        }
    };

    for(var key in lists.players){
        if(lists.players.hasOwnProperty(key)){
            render(lists.players[key], ui.allPlayers);
        }
    }

    lists.lobby.forEach(function(id){
        render(lists.players[id], ui.lobbyPlayers);
    });

    lists.inBattle.forEach(function(id){
        render(lists.players[id], ui.battlePlayers);
    });
}

function renderNick(){
    ui.showNick.html(itIsYou.nickName);
}

function renderShipLabel(){
    var ship = findWhere(templates, {side: itIsYou.side, kind: itIsYou.shipType});

    ui.showShip.html(ship ? ship.name : '[корабель]');
}

function openSelectShipWindow(){
    if(!world_opt.players[itIsYou._id].ship || !world_opt.players[itIsYou._id].ship.length){
        ui.shipModal.modal('show');
    }
}

function setShipType(shipType){
    itIsYou.shipType = shipType;
    socket.emit('set_ship_type', shipType);
    renderShipLabel();
    toLobby();
    ui.shipModal.modal('hide');
}

function selectSide(side){
    var name = $('#player_name');
    itIsYou.nickName = name.val();
    itIsYou.side = side;
    renderNick();
    ui.loginModal.modal('hide');
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
        ui.toBattle.show();
        if(!itIsYou.shipType){
            ui.shipModal.modal('show');
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
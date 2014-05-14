var socket = io.connect();
var itIsYou = {
    nickName: '',
    side: 'leaf',
    _id: ''
};

var ui = {
    leafButton: $('#leaf_button'),
    fireButton: $('#fire_button'),
    params: $('#params'),
    commandField: $('#command_line'),
    messageBox: $('#message'),
    nameField: $('.enter_player_name'),
    shipChoiсe: $('.choose_player_ship'),
    commandRow: $('.command_row'),
    shipContainer: $('#ship_container')
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
ui.nameField.show();
ui.shipChoiсe.hide();
ui.commandRow.hide();

socket.on('options', function(data){
    world_opt = data.world;
    templates = data.templates;
    templates.forEach(function(template){
        skins[template.side][template.kind] = {hull: new Image(), canon: new Image()};
        skins[template.side][template.kind].hull.src = 'images/hulls/' + template.hull_img;
        skins[template.side][template.kind].canon.src = 'images/canons/' + template.canon_img;
    });
    ui.leafButton.html('<i class="icon-eye-open icon-white"></i> Leaf ' + world_opt.resources.leaf);
    ui.fireButton.html('<i class="icon-eye-close icon-white"></i> Fire ' + world_opt.resources.fire);
    if(!data.reoption){
        itIsYou._id = data.player_id;
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
    }
});

socket.on('gamedata', function (data) {
    var dist, dir;
    var players = data.players;
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
        var direct = markOfNumber(world_opt.windForce);
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
        players.forEach(function(player){
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

socket.on('to_start_screen', function(){
    ui.leafButton.html('<i class="icon-eye-open icon-white"></i> Leaf ' + world_opt.resources.leaf);
    ui.fireButton.html('<i class="icon-eye-close icon-white"></i> Fire ' + world_opt.resources.fire);
    ui.nameField.show();
    ui.commandRow.hide();
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

function inBattle(shipType){
    ui.shipChoiсe.hide();
    ui.commandRow.show();
    ui.commandField.focus();
    socket.emit('create_player_object', {parent_id: itIsYou._id, ship_type: shipType});
}

function selectSide(side){
    var name = $('#player_name');
    itIsYou.nickName = name.val();
    itIsYou.side = side;
    ui.shipContainer.html('');
    templates.forEach(function(template){
        if(template.side == itIsYou.side && template.cost <= world_opt.resources[template.side]){
            var button = "inBattle('" + template.kind + "')";
            ui.shipContainer.append('<div class="row">' +
                '<div class="span6">' +
                '<button onclick="'+ button +'" class="btn relative-width-100">' + template.name + ' ' + template.cost + '</button>' +
                '</div>' +
                '</div>');
        }
    });
    ui.nameField.hide();
    ui.shipChoiсe.show();
    socket.emit('new_player', itIsYou);
}

function leaveBattle(){
    socket.emit('leave_battle', itIsYou);
}

function markOfNumber(number){
    return number<0 ? -1 : 1;
}

ui.commandField.keydown(function(event){
    if (event.which == 13){
        var command = ui.commandField.val();
        if(command){
            socket.emit('command', {command: command, player_id: itIsYou._id});
        }
        ui.commandField.val('').focus();
    }
});
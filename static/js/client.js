var socket = io.connect();
var itIsYou = {
    nickName: '',
    side: '',
    _id: ''
};

var commandField = $('#command_line');
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

var canon = new Image();
canon.src = 'images/canon.png';
var damagedCanon = new Image();
damagedCanon.src = 'images/damagedCanon.png';
var miss = new Image();
miss.src = 'images/miss.png';
var ammo = new Image();
ammo.src = 'images/ammo.png';

var world = Physics();

socket.on('options', function(data){
    itIsYou._id = data.player_id;
    console.log(data);
    data.templates.forEach(function(template){
        skins[template.side][template.kind] = {hull: new Image(), canon: new Image()};
        skins[template.side][template.kind].hull.src = 'images/hulls/' + template.hull_img;
        skins[template.side][template.kind].canon.src = 'images/' + template.canon_img;
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
});

socket.on('gamedata', function (data) {
    var players = data.players;
    var opt = data.options;
    if(hulls.length){world.remove(hulls);}
    if(canons.length){world.remove(canons);}
    if(bullets.length){world.remove(bullets);}
    if(misses.length){world.remove(misses);}
    if(flags.length){world.remove(flags);}
    hulls = [];
    canons = [];
    bullets = [];
    misses = [];
    flags = [];
    if(players.length){
        players.forEach(function(player){
            player.ship.forEach(function(obj){
                var newObject = null;
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
    }
    if(misses.length){world.add(misses);}
    if(hulls.length){world.add(hulls);}
    if(flags.length){world.add(flags);}
    if(canons.length){world.add(canons);}
    if(bullets.length){world.add(bullets);}
    world.render();
});

function inBattle(shipType){
    $('.choose_player_ship').addClass('hiddenRow');
    $('.command_row').removeClass('hiddenRow');
    commandField.focus();
    socket.emit('create_player_object', {parent_id: itIsYou._id, ship_type: shipType});
}

function selectSide(side){
    var name = $('#player_name');
    itIsYou.nickName = name.val();
    itIsYou.side = side;
    $('.enter_player_name').addClass('hiddenRow');
    $('.choose_player_ship').removeClass('hiddenRow');
    socket.emit('new_player', itIsYou);
}

commandField.keydown(function(event){
    if (event.which == 13){
        var command = commandField.val();
        if(command){
            socket.emit('command', {command: command, player_id: itIsYou._id});
        }
        commandField.val('').focus();
    }
});
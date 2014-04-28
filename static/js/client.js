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
var renderer = null;

var canon = new Image();
var hull = new Image();
canon.src = 'images/canon.png';
hull.src = 'images/hull.png';

var world = Physics();

socket.on('options', function(opt){
    renderer = Physics.renderer('canvas', {
        el: 'game_field',
        width: opt.width,
        height: opt.height,
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
    hulls = [];
    canons = [];
    bullets = [];
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
                if(obj.type == 'canon' && obj.status){ // [временно] поврежденная башня тупо не рисуется
                    newObject.view = canon;
                    // ... нарисовать поврежденную башню
                    /*if(!obj.status){
                        console.log('УБИТ');
                    }*/
                    newObject.state.angular.pos = Math.PI*obj.direction/180;
                    canons.push(newObject);
                }else if(obj.type == 'hull'){
                    newObject.view = hull;
                    newObject.state.angular.pos = Math.PI*obj.direction/180;
                    hulls.push(newObject);
                }else if(obj.type == 'ammo'){
                    newObject.state.angular.pos = Math.PI*obj.direction/180;
                    bullets.push(newObject);
                }
            });
        });
    }
    if(hulls.length){world.add(hulls);}
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
    itIsYou = {
        nickName: name.val(),
        side: side,
        _id: name.val()
    };
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

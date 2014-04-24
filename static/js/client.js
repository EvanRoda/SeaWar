var socket = io.connect();
var itIsYou = {
    nickName: '',
    side: '',
    _id: ''
};

var commandField = $('#command_line');

var canon = new Image();
canon.src = 'images/canon1.png';

var world = Physics();
var renderer = Physics.renderer('canvas', {
    el: 'game_field',
    width: 954,
    height: 810,
    meta: false, // don't display meta data
    styles: {
        // set colors for the circle bodies
        'circle' : {
            strokeStyle: '#351024',
            lineWidth: 1,
            fillStyle: '#d33682',
            angleIndicator: '#351024'
        }
    }
});

world.add( renderer );

var gameObjects = [];

socket.on('gamedata', function (players) {
    console.log('PLAYERS');
    console.log(players);
    var newObject = null;
    if(gameObjects.length){
        world.remove(gameObjects);
    }
    gameObjects = [];
    if(players.length){
        players.forEach(function(player){
            player.ship.forEach(function(obj){
                newObject = null;

                //Переворачиваем координаты для противников
                if(itIsYou.side != player.side){
                    obj.x = 954 - obj.x;
                    obj.y = 810 - obj.y;
                    obj.direction = obj.direction - 180;
                }

                //Рисуем (пока только пушки)
                if(obj.type == 'canon'){
                    newObject = Physics.body('circle', {
                        mass: 100,
                        radius: 21,
                        x: obj.x,
                        y: obj.y
                    });
                    newObject.view = canon;
                    newObject.state.angular.pos = Math.PI*obj.direction/180;
                    gameObjects.push(newObject);
                }
                console.log('GAME OBJECTS');
                console.log(gameObjects);
            });
        });
    }
    if(gameObjects.length){
        world.add(gameObjects);
    }
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

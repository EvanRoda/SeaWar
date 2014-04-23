var socket = io.connect();

socket.on('gamedata', function (data) {
    console.log(data);
    /* socket.emit('my other event', { my: 'data' });*/
});

var itIsYou = {
    nickName: '',
    side: '',
    _id: ''
};

function inBattle(){
    socket.emit('create_player_object', {parent_id: itIsYou._id, ship_type: 1});
}

function selectSide(side){
    var name = $('#player_name');
    itIsYou = {
        nickName: name.val(),
        side: side,
        _id: name.val()
    };
    socket.emit('new_player', itIsYou);
}
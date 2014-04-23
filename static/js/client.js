var socket = io.connect();

socket.on('gamedata', function (data) {
    console.log(data);
    /* socket.emit('my other event', { my: 'data' });*/
});

function postPlayerData(){
    socket.emit('new_player', { player: 'NewPlayer' });
}
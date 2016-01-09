seaApp.controller('MenuCtrl', ['$scope', '$http', function($scope, $http){
    $scope.hello = 'Hi, everyone!'
}]);

seaApp.controller('LoginCtrl', ['$scope', '$http', '$location', function($scope, $http, $location){
    $scope.auth = {
        password: '',
        username: ''
    };

    $scope.register = {
        username: '',
        password: '',
        confirm: ''
    };

    $scope.login = function(){
        $http.post('/login', function(a){
             console.log(a);
        });
    };

    $scope.register = function(){
        $http.post('/register', function(a){
            console.log(a);
        });
    };
}]);

seaApp.controller('BattleCtrl', ['$scope', '$rootScope', function($scope, $rootScope){
    console.log('Village!');
}]);

seaApp.controller('LobbyCtrl', ['$scope', '$http', function($scope, $http){
    var socket = io.connect();
    socket.emit('Hello', 'Привет сервер!');
    console.log('Maaaaaap!');

    $scope.callToServer = function(){
        $http.get('/test').then(function(){
            console.log('HUHU');
        });
    };

    $scope.goToDungeon = function(place){

    };
}]);
var seaApp = angular.module('seaApp', ['ngRoute']);

seaApp.config(['$routeProvider', function($routeProvider){
    $routeProvider
        .when('/login', {
            templateUrl: 'templates/login.html',
            controller: 'LoginCtrl'
        })
        .when('/', {
            templateUrl: 'templates/lobby.html',
            controller: 'LobbyCtrl'
        })
        .when('/battle', {
            templateUrl: 'templates/battle.html',
            controller: 'BattleCtrl'
        })
        .otherwise({
            redirectTo: '/'
        });
}]);




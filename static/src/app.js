'use strict';

var applications = require('./apps');
var directives = require('./directives');
var controllers = require('./controllers');
var services = require('./services');

var app = angular.module('app', ['ngCookies', 'ui.router', 'ui.select'].concat(applications));

app.config(/*@ngInject*/function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/layers/dashboard');
    $stateProvider
        .state('app', {
            url: '^/',
            abstract: true,
            controller: 'superCtrl as super',
            templateUrl: 'templates/super.html'
        });
});

for(var serviceName in services) {
    if(services.hasOwnProperty(serviceName)) {
        app.factory(serviceName, services[serviceName]);
    }
}

for(var dirName in directives) {
    if(directives.hasOwnProperty(dirName)) {
        app.directive(dirName, directives[dirName]);
    }
}

for(var ctrlName in controllers) {
    if(controllers.hasOwnProperty(ctrlName)) {
        app.controller(ctrlName, controllers[ctrlName]);
    }
}

app.run(/*@ngInject*/function() {

});

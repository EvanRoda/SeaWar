'use strict';

/*@ngInject*/
function routes($stateProvider, $urlRouterProvider) {
  $stateProvider
      .state('app.example', {
        url: '^/layers',
        abstract: true,
        templateUrl: 'apps/example/templates/base.html'
      })
      .state('app.layers.dashboard', {
        url: '/dashboard',
        templateUrl: 'apps/example/templates/dashboard.html',
        controller: 'exampleCtrl as ex'
      });
}

module.exports = routes;
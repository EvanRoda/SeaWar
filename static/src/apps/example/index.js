'use strict';
var controllers = require('./controllers');
var models = require('./models');

var app = angular.module('example', ['ui.router', 'ngResource']);

for(var modelName in models) {
  if(models.hasOwnProperty(modelName)) {
    app.factory(modelName, models[modelName]);
  }
}

for(var ctrlName in controllers) {
  if(controllers.hasOwnProperty(ctrlName)) {
    app.controller(ctrlName, controllers[ctrlName]);
  }
}

app.config(require('./routes'));

app.run(/*@ngInject*/function() {
});

module.exports = app;

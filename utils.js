var _ = require('lodash');

exports.extend = function(child, parent){
    for(var key in parent){
        if(parent.hasOwnProperty(key)){
            child[key] = parent[key];
        }
    }
    return child;
};

exports.markOfNumber = function(number){
    return number<0 ? -1 : 1;
};

exports.getRandom = function (value, percent){
    var dv = value * percent / 100;
    return _.random(-dv, dv, true);
};
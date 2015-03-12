var _ = require('lodash');

exports.extend = function(child, parent, rewrite){
    rewrite = rewrite || false;
    var i;
    var toStr = Object.prototype.toString;
    var astr = "[object Array]";
    child = child || {};
    for (i in parent) {
        if (parent.hasOwnProperty(i)) {
            if (parent[i] !== null && typeof parent[i] === "object") {
                child[i] = (toStr.call(parent[i]) === astr) ? [] : {};
                exports.extend(child[i], parent[i], rewrite);
            } else {
                if (rewrite) {
                    child[i] = parent[i];
                } else {
                    if(typeof child[i] == 'undefined') {
                        child[i] = parent[i];
                    }
                }
            }
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
var express = require('express');
var http = require('http');
var path = require('path');
var _ = require('lodash');
var config = require('config');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var mongoose = require('libs/mongoose');
var MongoStore = require('connect-mongo')(session);


var app = express();
var server = http.createServer(app);

/*var User = require('models/user').User;

var user = new User({
    username: "Toster",
    password: "Secret"
});

user.save(function(err, user, affected){
    if (err) throw err;
    User.findOne({username: 'Toster'}, function(err, test){
        console.log(test)
    })
});*/


app.use(favicon(__dirname + '/favicon.ico'));

app.use(bodyParser.json());
app.use(cookieParser());

app.use(session({
    secret: config.get('session:secret'),
    resave: config.get('session:resave'),
    saveUninitialized: config.get('session:saveUninitialized'),
    key: config.get('session:key'),
    cookie: config.get('session:cookie'),
    store: new MongoStore({mongooseConnection: mongoose.connection})
}));

app.use(express.static(path.join(__dirname, 'static')));

server.listen(config.get('port'), function(){
    console.log('Express server listening on port ' + config.get('port'));
});
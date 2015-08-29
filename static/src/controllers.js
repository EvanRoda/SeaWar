'use strict';

/*@ngInject*/
function superCtrl($scope, CurrentUser) {
    var self = this;
    self.auth = {
        login: '',
        password: ''
    };

    self.user = {};
    self.authorized = false;

    CurrentUser.userPromise = CurrentUser.getCurrentUser();

    CurrentUser.userPromise.then(function () {
        if(CurrentUser.authorized) {
            self.user = CurrentUser.user;
            self.authorized = true;
        }
    });

    self.login = function () {
        CurrentUser.login(self.auth.login, self.auth.password).then(function () {
            self.auth = {
                login: '',
                password: ''
            };
        });
    };

    self.logout = function () {
        CurrentUser.logout().then(function () {
        });
    };

    $scope.$on('CurrentUserAuthorize', function (event, auth, user) {
        self.authorized = auth;
        if(auth) {
            self.user = user;
        }
    });
}

module.exports = {
    superCtrl: superCtrl
};
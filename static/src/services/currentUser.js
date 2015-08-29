'use strict';

/*@ngInject*/
function CurrentUser($rootScope, $http, $cookies, BASE_URL) {
    var CurrUser = function () {
        var self = this;

        self.authorized = false;

        self.user = {};
        self.userPromise = null;

        self.getCurrentUser = function () {
            return $http.get(BASE_URL + '/api/v1/auth/user').then(function (user) {
                self.user = user.data;
                self.authorized = true;
                $rootScope.$broadcast('CurrentUserAuthorize', true, user.data);
            }, function (err) {
                if(err.status == 401) {
                    self.authorized = false;
                    self.user = null;
                    $rootScope.$broadcast('CurrentUserAuthorize', false);
                }
            });
        };

        $rootScope.$watch(function () {
            return $cookies['connect.sid'];
        }, function (newValue, oldValue) {
            if(newValue != oldValue) {
                self.userPromise = self.getCurrentUser();
            }
        });

        self.login = function (login, pass) {
            return $http.post(BASE_URL + '/api/v1/auth/login', {login: login, password: pass});
        };

        self.logout = function () {
            return $http.get(BASE_URL + '/api/v1/auth/logout');
        };
    };

    return new CurrUser();
}

module.exports = CurrentUser;
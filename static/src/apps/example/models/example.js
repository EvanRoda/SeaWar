'use strict';

/*@ngInject*/
function Example($resource, BASE_URL) {
    var Model = $resource(BASE_URL + '/api/v1/examples/:id', {id: '@_id'}, {
        update: {
            method: 'PUT'
        }
    });

    return Model;
}

module.exports = Example;
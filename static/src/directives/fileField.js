'use strict';

function fileField() {
    return {
        restrict: 'A',
        scope: {
            fileField: '='
        },
        link: function (scope, element) {
            element.on('change', function () {
                if(element.get(0).files.length) {
                    scope.$apply(function () {
                        scope.fileField = element.get(0).files[0];
                    });
                }
            });
        }
    };
}

module.exports = fileField;
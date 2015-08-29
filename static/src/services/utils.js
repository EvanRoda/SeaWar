'use strict';

/*@ngInject*/
function Utils() {
    return {
        loadOverlay: {
            open: function () {
                var overlay = $('<div id="load_overlay"></div>');
                var loader = $('<div class="loader"></div>');
                loader.append('<div><i class="fa fa-spinner fa-spin"></i></div>');
                loader.append('<div>Please wait...</div>');
                overlay.append(loader);
                $('body').append(overlay);
            },
            close: function () {
                $('#load_overlay').remove();
            }
        }
    }
}

module.exports = Utils;
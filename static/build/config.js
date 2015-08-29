var path = require('path');

module.exports = {
    scripts: {
        src: path.join(__dirname, '..', 'src' ,'app.js'),
        destPath: path.join(__dirname, '..', 'dist')
    },
    libs: {
        src: path.join(__dirname, '..', 'src', 'libs.js'),
        destPath: path.join(__dirname, '..', 'dist')
    },
    styles: {
        srcPath: path.join(__dirname, '..', 'src', 'styles', '**', '[^_]*.scss'),
        destPath: path.join(__dirname, '..', 'dist', 'styles')
    },
    html: {
        srcPath: path.join(__dirname, '..', 'src', '**', '*.html'),
        destPath: path.join(__dirname, '..', 'dist')
    },
    fonts: {
        srcPath: path.join(__dirname, '..', 'src', 'fonts', '**', '*.*'),
        destPath: path.join(__dirname, '..', 'dist', 'fonts')
    },
    images: {
      srcPath: path.join(__dirname, '..', 'src', 'images', '**', '*'),
      destPath: path.join(__dirname, '..', 'dist', 'images')
    }
    ,
    templates: {
      srcPath: path.join(__dirname, '..', 'src', '**', 'templates', '**', '*.html'),
      destPath: path.join(__dirname, '..', 'dist')
    }
};
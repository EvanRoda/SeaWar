var gulp = require('gulp');
var sass = require('gulp-sass');

var config = require('../config').styles;

module.exports = gulp.task('styles', function() {
    return gulp.src(config.srcPath)
        .pipe(sass())
        .pipe(gulp.dest(config.destPath));
});
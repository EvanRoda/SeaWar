var gulp = require('gulp');

var config = require('../config').html;

module.exports = gulp.task('html', function() {
    return gulp.src(config.srcPath)
        .pipe(gulp.dest(config.destPath));
});
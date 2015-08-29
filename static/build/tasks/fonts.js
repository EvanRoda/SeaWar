var gulp = require('gulp');

var config = require('../config').fonts;

module.exports = gulp.task('fonts', function() {
    return gulp.src(config.srcPath)
        .pipe(gulp.dest(config.destPath));
});
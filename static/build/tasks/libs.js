var browserify = require('browserify');
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var debowerify = require('debowerify');

var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');

var config = require('../config').libs;

module.exports = gulp.task('libs', function() {
    return browserify({entries: config.src, debug: true})
        .transform(debowerify)
        .bundle()
        .pipe(source('libs.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(config.destPath));
});
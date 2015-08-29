var browserify = require('browserify');
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var debowerify = require('debowerify');

var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var ngAnnotate = require('gulp-ng-annotate');

var config = require('../config').scripts;

module.exports = gulp.task('scripts', function() {
    return browserify({entries: config.src, debug: true, insertGlobals: true})
        .transform(debowerify)
        .bundle()
        .pipe(source('app.js'))
        .pipe(buffer())
        .pipe(ngAnnotate())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(config.destPath));
});
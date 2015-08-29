var gulp = require('gulp');
var path = require('path');

var config = require('../config');

gulp.task('watch', function() {
    gulp.watch(path.join(__dirname, '..', '..', 'src', '**', '*.js'), ['scripts']);
    gulp.watch(path.join(__dirname, '..', '..', 'src', '**', '*.scss'), ['styles']);
    gulp.watch(path.join(__dirname, '..', '..', 'src', '**', '*.html'), ['html']);
    gulp.watch(path.join(__dirname, '..', '..', 'src', '**', '*.jade'), ['jade']);
});
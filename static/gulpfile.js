var gulp = require('gulp');
var runSequence = require('run-sequence');

require('./build/tasks');

gulp.task('build', function() {
  runSequence('clean',
      ['scripts', 'libs', 'styles', 'html', 'images', 'templates', 'fonts']);
});

gulp.task('default', ['scripts', 'styles', 'html', 'templates', 'fonts', 'watch']);
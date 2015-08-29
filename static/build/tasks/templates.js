var gulp = require('gulp');
var templateCache = require('gulp-angular-templatecache');

var config = require('../config').templates;

module.exports = gulp.task('templates', function() {
  return gulp.src(config.srcPath)
      .pipe(templateCache('templates.js', {module: 'app'}))
      .pipe(gulp.dest(config.destPath));
});
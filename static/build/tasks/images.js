'use strict';
var gulp = require('gulp');

var config = require('../config').images;

module.exports = gulp.task('images', function () {
  return gulp.src(config.srcPath)
      .pipe(gulp.dest(config.destPath));
});
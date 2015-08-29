'use strict';

var path = require('path');
var gulp = require('gulp');
var del = require('del');

module.exports = gulp.task('clean', function(cb) {
  del([
    path.join(__dirname, '..', '..', 'dist', '*')
  ], cb);
});
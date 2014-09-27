/* jshint node: true */

var gulp = require('gulp');
var replace = require('gulp-replace');
var concat = require('gulp-concat');
var closureCompiler = require('gulp-closure-compiler');

var COMPILER_PATH = 'node_modules/closurecompiler/compiler/compiler.jar';

gulp.task('build-cat', function() {
  return gulp.src(['./src/libtess.js', './src/**/*.js', './build/node_export.js'])
    // remove license at top of each file
    .pipe(replace(/^\/\*[\s\*]+Copyright 2000[\s\S]*?\*\//m, ''))
    .pipe(concat('libtess.cat.js'))
    .pipe(gulp.dest('.'));
});

gulp.task('build-min', function() {
  return gulp.src(['./src/libtess.js', './src/**/*.js', './build/closure_exports.js'])
    .pipe(closureCompiler({
      compilerPath: COMPILER_PATH,
      fileName: 'libtess.min.js',
      compilerFlags: {
        compilation_level: 'ADVANCED_OPTIMIZATIONS',
        warning_level: 'VERBOSE',
        language_in: 'ECMASCRIPT5_STRICT',
        define: [
          // NOTE(bckenny): switch to true for assertions throughout code
          'libtess.DEBUG=false'
        ],
        jscomp_warning: [
          // https://github.com/google/closure-compiler/wiki/Warnings
          'accessControls',
          'const',
          'visibility',
        ],
        use_types_for_optimization: null,
        use_only_custom_externs: null,
        externs: [
          './build/externs/es5.js',
          './build/externs/es3.js'
        ],

        // for node export
        output_wrapper: '%output% if (typeof module !== \'undefined\') { module.exports = this.libtess; }'
      }
    }))
    .pipe(gulp.dest('.'));
});

gulp.task('prepublish', ['build-cat', 'build-min']);

gulp.task('default', ['prepublish']);

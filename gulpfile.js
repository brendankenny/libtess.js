/* jshint node: true */

var gulp = require('gulp');
var replace = require('gulp-replace');
var concat = require('gulp-concat');
var closureCompiler = require('gulp-closure-compiler');
var mocha = require('gulp-mocha');
var browserify = require('browserify');
var vinylTransform = require('vinyl-transform');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');

var COMPILER_PATH = 'node_modules/closurecompiler/compiler/compiler.jar';
var LIBTESS_SRC = ['./src/libtess.js', './src/**/*.js'];
var JSHINT_SRC = ['./libtess.cat.js', './{build,examples,test}/**/*.{js,html}',
    '!./build/externs/*', '!./test/tests-browserified.js',
    '!./test/expectations/*'];

gulp.task('build-cat', function() {
  return gulp.src(LIBTESS_SRC.concat('./build/node_export.js'))
    // remove license at top of each file
    .pipe(replace(/^\/\*[\s\*]+Copyright 2000[\s\S]*?\*\//m, ''))
    .pipe(concat('libtess.cat.js'))
    .pipe(gulp.dest('.'));
});

gulp.task('build-min', function() {
  return gulp.src(LIBTESS_SRC.concat('./build/closure_exports.js'))
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

gulp.task('browserify-tests', function() {
  return gulp.src('test/*.test.js')
    .pipe(vinylTransform(function(filename) {
      return browserify(filename)
        // custom chai and libtess injected on page (for e.g. debug libtess)
        // TODO(bckenny): is there a less-dumb way of doing this?
        .require('./test/browser/fake-chai.js', {expose: 'chai'})
        .require('./test/browser/fake-libtess.js', {expose: '../libtess.min.js'})

        // expand list of tests in geometry/ at browserify time
        .ignore('./test/rfolder.js')
        .transform('rfolderify')

        .bundle();
    }))
    .pipe(concat('tests-browserified.js', {newLine: ';'}))
    .pipe(gulp.dest('./test'));
});

gulp.task('build', ['build-cat', 'build-min', 'browserify-tests']);

gulp.task('lint', ['build'], function() {
  return gulp.src(LIBTESS_SRC.concat(JSHINT_SRC))
    .pipe(jshint.extract('auto'))
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .pipe(jshint.reporter('fail'));
});

gulp.task('test', ['lint'], function() {
  return gulp.src(['test/*.test.js'], {read: false})
    .pipe(mocha({
      reporter: 'spec',
      ui: 'tdd'
    }));
});

gulp.task('default', ['build']);

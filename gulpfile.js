/* jshint node: true, esnext: true */
'use strict';

var gulp = require('gulp');
var replace = require('gulp-replace');
var concat = require('gulp-concat');
var closureCompiler = require('gulp-closure-compiler');
var mocha = require('gulp-mocha');
var browserify = require('browserify');
var glob = require('glob');
var vinylSource = require('vinyl-source-stream');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var jscs = require('gulp-jscs');
var filter = require('gulp-filter');
var istanbul = require('gulp-istanbul');
var rocambole = require('rocambole');
var rocamboleToken = require('rocambole-token');
var vinylMap = require('vinyl-map');
var rename = require('gulp-rename');
var coveralls = require('gulp-coveralls');
var path = require('path');
var newer = require('gulp-newer');

var COMPILER_PATH = 'node_modules/closurecompiler/compiler/compiler.jar';
var LIBTESS_SRC = ['./src/libtess.js', './src/**/*.js'];
// NOTE(bckenny): checking all of third_party for now. Modify if checking in
// third-party code that doesn't conform to style.
var LINT_SRC = LIBTESS_SRC.concat([
  './gulpfile.js',
  './libtess.cat.js',
  './libtess.debug.js',
  './{build,examples,test,third_party}/**/*.{js,html}',
  '!./test/browser/*-browserified.js',
  '!./test/expectations/*',
  '!./third_party/node_modules/**',

  // NOTE(bckenny): It takes two minutes to lint these. Skip them for now.
  '!./examples/osm/nyc_midtown_*.js'
]);

/**
 * Determine if an AST node is a `libtess.assert` call, remove assert (and
 * surrounding whitespace) if so.
 */
function stripAsserts(node) {
  // looking only for assert calls
  if (node.type !== 'CallExpression' ||
      node.callee.type !== 'MemberExpression' ||
      node.callee.property.name !== 'assert' ||
      node.callee.object.type !== 'Identifier' ||
      node.callee.object.name !== 'libtess') {
    return;
  }

  // need to expand [startToken, endToken] to include beginning whitespace and
  // ending `;\n`
  var startToken = node.startToken;
  if (startToken.prev.type === 'WhiteSpace') {
    startToken = startToken.prev;
  }
  var endToken = node.endToken;
  if (endToken.next.value === ';' &&
      endToken.next.next.type === 'LineBreak') {
    endToken = endToken.next.next;
  }

  // if removing the assert is going to leave two blank lines, remove one
  if (startToken.prev.prev.type === 'LineBreak' &&
      endToken.next.type === 'LineBreak') {
    endToken = endToken.next;
  }

  // because our lint rules require things like always using curly braces, we
  // can safely remove libtess.assert(...) calls without replacing them with
  // `void 0` or the like.
  rocamboleToken.eachInBetween(startToken, endToken, rocamboleToken.remove);
}

/**
 * Build a single-file version of libtess, one (libtess.debug.js) with asserts
 * turned on, and one (libtess.cat.js) with them stripped out.
 */
gulp.task('build-cat', () => {
  return gulp.src(LIBTESS_SRC.concat('./build/node_export.js'))
    .pipe(newer('./libtess.debug.js'))
    // remove license at top of each file except first (which begins '@license')
    .pipe(replace(/^\/\*[\s\*]+Copyright 2000[\s\S]*?\*\//m, ''))
    .pipe(concat('libtess.debug.js'))
    .pipe(gulp.dest('.'))

    .pipe(newer('./libtess.cat.js'))

    // remove asserts
    .pipe(vinylMap((code, filename) => {
      var stripped = rocambole.moonwalk(code.toString(), stripAsserts);
      return stripped.toString();
    }))

    // disable `libtess.DEBUG` so debug branches are never taken
    .pipe(replace('libtess.DEBUG = true;', 'libtess.DEBUG = false;'))
    .pipe(rename('libtess.cat.js'))
    .pipe(gulp.dest('.'));
});

/**
 * Compile libtess using the Closure Compiler.
 */
gulp.task('build-min', () => {
  return gulp.src(LIBTESS_SRC.concat('./build/closure_exports.js'))
    .pipe(newer('./libtess.min.js'))
    .pipe(closureCompiler({
      compilerPath: COMPILER_PATH,
      fileName: 'libtess.min.js',
      compilerFlags: {
        compilation_level: 'ADVANCED_OPTIMIZATIONS',
        warning_level: 'VERBOSE',
        language_in: 'ECMASCRIPT5_STRICT',
        define: [
          // NOTE(bckenny): switch to true for assertions throughout code.
          'libtess.DEBUG=false'
        ],
        jscomp_warning: [
          // https://github.com/google/closure-compiler/wiki/Warnings
          'accessControls',
          'const',
          'visibility',
        ],
        use_types_for_optimization: null,

        // Since DOM isn't touched, don't use default externs, leaving only the
        // core language keywords unobfuscated.
        env: 'CUSTOM',

        // for node export
        output_wrapper: '%output% if (typeof module !== \'undefined\') { ' +
            'module.exports = this.libtess; }'
      }
    }))
    .pipe(gulp.dest('.'));
});

/**
 * Lint code with JSHint and JSCS.
 */
gulp.task('lint', ['build-cat'], () => {
  return gulp.src(LINT_SRC)
    // jshint
    .pipe(jshint.extract('auto'))
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .pipe(jshint.reporter('fail'))

    // jscs (code style)
    // TODO(bckenny): get jscs to lint inline JS in html?
    .pipe(filter('**/*.js'))
    .pipe(jscs())
    .pipe(jscs.reporter())
    .pipe(jscs.reporter('fail'));
});

/**
 * Run full test suite over compiled libtess.
 */
gulp.task('test-suite', ['build-min'], () => {
  return gulp.src('test/*.test.js', {read: false})
    .pipe(mocha({
      reporter: 'dot',
      ui: 'tdd'
    }));
});

/**
 * Track code coverage of test suite. libtess.debug.js is loaded as global
 * variable `_injectedLibtess` so it is used for coverage (see test/common.js).
 */
gulp.task('coverage', ['build-cat'], (doneCallback) => {
  gulp.src('libtess.debug.js')
    .pipe(istanbul())
    .pipe(istanbul.hookRequire())
    .on('finish', () => {
      gulp.src('test/*.test.js', {read: false})
        .pipe(mocha({
          reporter: 'dot',
          ui: 'tdd',
          require: [
            // Inject libtess.debug.js so coverage is run over it.
            './test/injection/debug.js'
          ]
        }))
        .pipe(istanbul.writeReports())
        .on('end', doneCallback);
    });
});

/**
 * If running in some CI environment, attempt to upload results to Coveralls.
 */
gulp.task('coveralls', ['coverage'], () => {
  if (!process.env.CI) {
    console.log('exiting coverage without uploading to coveralls');
    return;
  }

  return gulp.src(path.join(__dirname, 'coverage/lcov.info')).pipe(coveralls());
});

/**
 * Copy latest mocha and chai over to third_party for distribution for live
 * testing on gh-pages.
 */
gulp.task('dist-test-libs', () => {
  return gulp.src([
    'node_modules/mocha/mocha.{css,js}',
    'node_modules/mocha/LICENSE',
    'node_modules/chai/{chai.js,README.md}',
  ], {base: './'})
    .pipe(gulp.dest('./third_party'));
});

/**
 * Create a version of the tests that can run in a browser (test/index.html).
 */
gulp.task('browserify-tests', () => {
  // only includes baseline tess (uses libtess in page), so no prereqs
  return browserify(glob.sync('./test/*.test.js'))
    // chai and libtess injected on page, so just load stubs
    .require('./test/browser/fake-chai.js', {expose: 'chai'})
    .require('./test/browser/fake-libtess.js', {expose: '../libtess.min.js'})

    // expand list of tests in geometry/ at browserify time
    .ignore('./test/rfolder.js')
    .transform('rfolderify')

    .bundle()

    // convert to vinyl stream and output via gulp.dest
    .pipe(vinylSource('tests-browserified.js'))
    .pipe(gulp.dest('./test/browser'));
});

/**
 * Browserify the geometry tests so they can be run in an expectations
 * comparison page.
 */
gulp.task('browserify-expectations-viewer', () => {
  return browserify('./test/expectations-viewer.js')
    .require('./test/browser/fake-chai.js', {expose: 'chai'})
    .require('./test/browser/fake-libtess.js', {expose: '../libtess.min.js'})

    // expand list of tests in geometry/ at browserify time
    .ignore('./test/rfolder.js')
    .transform('rfolderify')

    .bundle()

    // convert to vinyl stream and output via gulp.dest
    .pipe(vinylSource('expectations-viewer-browserified.js'))
    .pipe(gulp.dest('./test/browser'));
});

gulp.task('test', ['lint', 'test-suite']);

gulp.task('build', [
  'build-cat',
  'build-min',
  'browserify-tests',
  'dist-test-libs',
  'browserify-expectations-viewer'
]);

gulp.task('default', ['build']);

/* jshint node: true */
/* global suite, test */
'use strict';

var chai = require('chai');
var assert = chai.assert;

var libtess = require('../libtess.min.js');
var common = require('./common.js');
var createTessellator = common.createInstrumentedTessellator;
var hourglass = require('./geometry/hourglass.json');

/**
 * The result of triangulating hourglass with the default options.
 * @private {!Array.Array.<number>}
 * @const
 */
var HOURGLASS_RESULT_ = [
  [1, 1, 0, 0, 0, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 0, 0, 0]
];

suite('Explicit Error States', function() {
  var contour = hourglass.value[0];

  suite('GLU_TESS_MISSING_BEGIN_POLYGON', function() {
    test('should throw when gluTessBeginContour called without it', function() {
      var tess = createTessellator(libtess);
      assert.throw(tess.gluTessBeginContour.bind(tess),
          'GLU_TESS_MISSING_BEGIN_POLYGON',
          'did not throw GLU_TESS_MISSING_BEGIN_POLYGON');
    });
    test('should throw when gluTessVertex called without it', function() {
      var tess = createTessellator(libtess);
      assert.throw(tess.gluTessVertex.bind(tess, [0, 0, 1], [0, 0, 1]),
          'GLU_TESS_MISSING_BEGIN_POLYGON',
          'did not throw GLU_TESS_MISSING_BEGIN_POLYGON');
    });
    test('should throw when gluTessEndContour called without it', function() {
      var tess = createTessellator(libtess);
      assert.throw(tess.gluTessEndContour.bind(tess),
          'GLU_TESS_MISSING_BEGIN_POLYGON',
          'did not throw GLU_TESS_MISSING_BEGIN_POLYGON');
    });
    test('should throw when gluTessEndPolygon called without it', function() {
      var tess = createTessellator(libtess);
      assert.throw(tess.gluTessEndPolygon.bind(tess),
          'GLU_TESS_MISSING_BEGIN_POLYGON',
          'did not throw GLU_TESS_MISSING_BEGIN_POLYGON');
    });
  });

  // from the original README: 
  // The interface recovers from these errors by inserting the missing call(s).

  suite('GLU_TESS_MISSING_BEGIN_CONTOUR', function() {
    var resultVerts = [];
    var tess = createTessellator(libtess);

    // overwrite error handler
    var errorValue = -1;
    var errorHandler = function missingBeginContourHandler(errorNumber) {
      errorValue = errorNumber;
    };
    tess.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR, errorHandler);

    test('should throw when gluTessVertex called without it', function() {
      tess.gluTessBeginPolygon(resultVerts);
      var coords = [contour[0], contour[1], contour[2]];
      tess.gluTessVertex(coords, coords);
      assert.strictEqual(errorValue,
          libtess.errorType.GLU_TESS_MISSING_BEGIN_CONTOUR,
          'did not throw GLU_TESS_MISSING_BEGIN_CONTOUR');
    });
    test('tessellator should recover and produce a correct result', function() {
      for (var i = 3; i < contour.length; i += 3) {
        var coords = [contour[i], contour[i + 1], contour[i + 2]];
        tess.gluTessVertex(coords, coords);
      }
      tess.gluTessEndContour();
      tess.gluTessEndPolygon();
      assert.deepEqual(resultVerts, HOURGLASS_RESULT_,
          'tessellation not correct after GLU_TESS_MISSING_BEGIN_CONTOUR error');
    });
    test('should throw when gluTessEndContour called without it', function() {
      var tess = createTessellator(libtess);
      tess.gluTessBeginPolygon(resultVerts);
      assert.throw(tess.gluTessEndContour.bind(tess),
          'GLU_TESS_MISSING_BEGIN_CONTOUR',
          'did not throw GLU_TESS_MISSING_BEGIN_CONTOUR');
    });
  });

  suite('GLU_TESS_MISSING_END_CONTOUR', function() {
    var resultVerts = [];
    var tess = createTessellator(libtess);

    // overwrite error handler
    var errorValue = -1;
    var errorHandler = function missingEndContourHandler(errorNumber) {
      errorValue = errorNumber;
    };
    tess.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR, errorHandler);

    test('should throw when gluTessEndPolygon called without it', function() {
      tess.gluTessBeginPolygon(resultVerts);
      tess.gluTessBeginContour();
      for (var i = 0; i < contour.length; i += 3) {
        var coords = [contour[i], contour[i + 1], contour[i + 2]];
        tess.gluTessVertex(coords, coords);
      }
      tess.gluTessEndPolygon();
      assert.strictEqual(errorValue,
          libtess.errorType.GLU_TESS_MISSING_END_CONTOUR,
          'did not throw GLU_TESS_MISSING_END_CONTOUR');
    });
    test('tessellator should recover and produce a correct result', function() {
      assert.deepEqual(resultVerts, HOURGLASS_RESULT_,
          'tessellation not correct after GLU_TESS_MISSING_END_CONTOUR error');
    });
  });

  suite('GLU_TESS_MISSING_END_POLYGON', function() {
    var resultVerts = [];
    var tess = createTessellator(libtess);

    // overwrite error handler
    var errorValue = -1;
    var errorHandler = function missingEndPolygonHandler(errorNumber) {
      errorValue = errorNumber;
    };
    tess.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR, errorHandler);

    tess.gluTessBeginPolygon(resultVerts);

    tess.gluTessBeginContour();
    for (var i = 0; i < contour.length; i += 3) {
      var coords = [contour[i], contour[i + 1], contour[i + 2]];
      tess.gluTessVertex(coords, coords);
    }
    tess.gluTessEndContour();

    test('should throw if next polygon begun without calling it', function() {
      tess.gluTessBeginPolygon();
      assert.strictEqual(errorValue,
          libtess.errorType.GLU_TESS_MISSING_END_POLYGON,
          'did not throw GLU_TESS_MISSING_END_POLYGON');
    });
    // NOTE(bckenny): according to readme, libtess should recover and spit out
    // the tessellated result. However, in tess.c, MakeDormant is called
    // instead, deleting the mesh and resetting the tessellator
    // (see http://cgit.freedesktop.org/mesa/glu/tree/src/libtess/tess.c#n180)
    // test('tessellator should recover and produce a correct result', function() {
    //   assert.deepEqual(resultVerts, HOURGLASS_RESULT_,
    //       'tessellation not correct after GLU_TESS_MISSING_END_POLYGON error');
    // });
  });

  // from the readme:
  // GLU_TESS_COORD_TOO_LARGE says that some vertex coordinate exceeded
  // the predefined constant GLU_TESS_MAX_COORD in absolute value, and
  // that the value has been clamped (Coordinate values must be small
  // enough so that two can be multiplied together without overflow).
  suite('GLU_TESS_COORD_TOO_LARGE errors', function() {
    test('should throw if x coordinate is too large', function() {
      var tess = createTessellator(libtess);
      tess.gluTessBeginPolygon();
      tess.gluTessBeginContour();

      assert.throws(tess.gluTessVertex.bind(tess, [1e151, 0, 0]),
          'GLU_TESS_COORD_TOO_LARGE', 'did not throw GLU_TESS_COORD_TOO_LARGE');
    });
    test('should throw if y coordinate is too large', function() {
      var tess = createTessellator(libtess);
      tess.gluTessBeginPolygon();
      tess.gluTessBeginContour();

      assert.throws(tess.gluTessVertex.bind(tess, [0, 1e151, 0]),
          'GLU_TESS_COORD_TOO_LARGE', 'did not throw GLU_TESS_COORD_TOO_LARGE');
    });
    test('should throw if z coordinate is too large', function() {
      var tess = createTessellator(libtess);
      tess.gluTessBeginPolygon();
      tess.gluTessBeginContour();

      assert.throws(tess.gluTessVertex.bind(tess, [0, 0, 1e151]),
          'GLU_TESS_COORD_TOO_LARGE', 'did not throw GLU_TESS_COORD_TOO_LARGE');
    });

    test('should be clamped but too-large values should roundtrip', function() {
      var tess = createTessellator(libtess);

      // overwrite error handler
      var errorValue = -1;
      var errorHandler = function tooLargeHandler(errorNumber) {
        errorValue = errorNumber;
      };
      tess.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR, errorHandler);

      var tooLargeContour = [
        1, 0, 1e151,
        0, 1, 1e151,
        0, 0, 1e151
      ];
      var resultVerts = [];

      tess.gluTessBeginPolygon(resultVerts);
      tess.gluTessBeginContour();
      for (var i = 0; i < tooLargeContour.length; i += 3) {
        var coords = [
          tooLargeContour[i],
          tooLargeContour[i + 1],
          tooLargeContour[i + 2]
        ];
        tess.gluTessVertex(coords, coords);
        assert.strictEqual(errorValue,
            libtess.errorType.GLU_TESS_COORD_TOO_LARGE,
            'did not throw GLU_TESS_COORD_TOO_LARGE');
        
        // reset error state
        errorValue = -1;
      }
      tess.gluTessEndContour();
      tess.gluTessEndPolygon();

      assert.deepEqual(resultVerts, [tooLargeContour],
          'tessellation not correct after GLU_TESS_COORD_TOO_LARGE error');
    });
  });

  // from the readme:
  // GLU_TESS_NEED_COMBINE_CALLBACK says that the algorithm detected an
  // intersection between two edges in the input data, and the "combine"
  // callback (below) was not provided. No output will be generated.
  // 
  // This is the only error that can occur during tesselation and rendering.
  suite('GLU_TESS_NEED_COMBINE_CALLBACK errors', function() {
    var resultVerts = [];

    test('should throw if no combine callback is provided', function() {
      var tess = createTessellator(libtess);

      // overwrite combine callback
      tess.gluTessCallback(libtess.gluEnum.GLU_TESS_COMBINE, null);

      // overwrite error handler
      var errorValue = -1;
      var errorHandler = function needCombineHandler(errorNumber) {
        errorValue = errorNumber;
      };
      tess.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR, errorHandler);

      tess.gluTessBeginPolygon(resultVerts);
      tess.gluTessBeginContour();
      for (var i = 0; i < contour.length; i += 3) {
        var coords = [contour[i], contour[i + 1], contour[i + 2]];
        tess.gluTessVertex(coords, coords);
      }
      tess.gluTessEndContour();

      assert.strictEqual(errorValue, -1,
          'no error should be thrown until tessellation time');

      tess.gluTessEndPolygon();

      assert.strictEqual(errorValue,
          libtess.errorType.GLU_TESS_NEED_COMBINE_CALLBACK,
          'no error should be thrown until tessellation time');
    });

    test('no output should be generated', function() {
      assert.deepEqual(resultVerts, [], 'no output should be generated');
    });
  });
});

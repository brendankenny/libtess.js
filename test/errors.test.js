/* jshint node: true */
/* global suite, test */
'use strict';

var chai = require('chai');
var assert = chai.assert;

var common = require('./common.js');
var libtess = common.libtess;
var createTessellator = common.createInstrumentedTessellator;
var hourglass = require('./geometry/hourglass.js');

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

  suite('ERROR_DATA', function() {
    test('polygon data should roundtrip even through error', function() {
      var resultVerts = [];
      var tess = createTessellator(libtess);

      // overwrite error handler
      var errorValue = -1;
      var errorData = null;
      var errorHandler = function errorDataHandler(errorNumber, polygonData) {
        errorValue = errorNumber;
        errorData = polygonData;
      };
      tess.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR_DATA, errorHandler);

      tess.gluTessBeginPolygon(resultVerts);
      var coords = [contour[0], contour[1], contour[2]];
      tess.gluTessVertex(coords, coords);
      assert.strictEqual(errorValue,
          libtess.errorType.GLU_TESS_MISSING_BEGIN_CONTOUR,
          'did not throw GLU_TESS_MISSING_BEGIN_CONTOUR');
      assert.isNotNull(errorData, 'ERROR_DATA data is null');
      assert.strictEqual(errorData, resultVerts,
          'ERROR_DATA did not return polygon data');
    });
  });

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
    test('should recover if error caught', function() {
      var tess = createTessellator(libtess);

      // overwrite error handler
      var errorValue = -1;
      var errorHandler = function missingBeginPolygonHandler(errorNumber) {
        errorValue = errorNumber;
      };
      tess.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR, errorHandler);

      tess.gluTessBeginContour();

      // test that error was correctly generated
      assert.strictEqual(errorValue,
          libtess.errorType.GLU_TESS_MISSING_BEGIN_POLYGON,
          'did not throw GLU_TESS_MISSING_BEGIN_POLYGON');

      // test that tess has recovered and data entry can proceed
      assert.doesNotThrow(tess.gluTessEndContour.bind(tess));
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
          'tessellation incorrect after GLU_TESS_MISSING_BEGIN_CONTOUR error');
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
          'tessellation incorrect after GLU_TESS_MISSING_END_CONTOUR error');
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

    // the mesh isn't created until the cache is emptied, so add a dummy contour
    // to force it to empty (see internal comment in gluTessBeginContour) to
    // fully cover libtess.GluTesselator.makeDormant_
    tess.gluTessBeginContour();
    tess.gluTessVertex([0, 0, 0], [0, 0, 0]);
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
    // libtess.js now recovers by producing the tessellation.
    test('tessellator should recover and produce a correct result', function() {
      assert.deepEqual(resultVerts, HOURGLASS_RESULT_,
          'tessellation incorrect after GLU_TESS_MISSING_END_POLYGON error');
    });
  });

  // from the readme:
  // GLU_TESS_COORD_TOO_LARGE says that some vertex coordinate exceeded
  // the predefined constant GLU_TESS_MAX_COORD in absolute value, and
  // that the value has been clamped (Coordinate values must be small
  // enough so that two can be multiplied together without overflow).
  suite('GLU_TESS_COORD_TOO_LARGE', function() {
    test('should throw if x coordinate is too large or small', function() {
      var tess = createTessellator(libtess);
      tess.gluTessBeginPolygon();
      tess.gluTessBeginContour();

      assert.throws(tess.gluTessVertex.bind(tess, [1e151, 0, 0]),
          'GLU_TESS_COORD_TOO_LARGE', 'did not throw GLU_TESS_COORD_TOO_LARGE');

      tess = createTessellator(libtess);
      tess.gluTessBeginPolygon();
      tess.gluTessBeginContour();

      assert.throws(tess.gluTessVertex.bind(tess, [-1e151, 0, 0]),
          'GLU_TESS_COORD_TOO_LARGE', 'did not throw GLU_TESS_COORD_TOO_LARGE');
    });
    test('should throw if y coordinate is too large or small', function() {
      var tess = createTessellator(libtess);
      tess.gluTessBeginPolygon();
      tess.gluTessBeginContour();

      assert.throws(tess.gluTessVertex.bind(tess, [0, 1e151, 0]),
          'GLU_TESS_COORD_TOO_LARGE', 'did not throw GLU_TESS_COORD_TOO_LARGE');

      tess = createTessellator(libtess);
      tess.gluTessBeginPolygon();
      tess.gluTessBeginContour();

      assert.throws(tess.gluTessVertex.bind(tess, [0, -1e151, 0]),
          'GLU_TESS_COORD_TOO_LARGE', 'did not throw GLU_TESS_COORD_TOO_LARGE');
    });
    test('should throw if z coordinate is too large or small', function() {
      var tess = createTessellator(libtess);
      tess.gluTessBeginPolygon();
      tess.gluTessBeginContour();

      assert.throws(tess.gluTessVertex.bind(tess, [0, 0, 1e151]),
          'GLU_TESS_COORD_TOO_LARGE', 'did not throw GLU_TESS_COORD_TOO_LARGE');

      tess = createTessellator(libtess);
      tess.gluTessBeginPolygon();
      tess.gluTessBeginContour();

      assert.throws(tess.gluTessVertex.bind(tess, [0, 0, -1e151]),
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
        0, 1, -1e151,
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
          'tessellation incorrect after GLU_TESS_COORD_TOO_LARGE error');
    });
  });

  // from the readme:
  // GLU_TESS_NEED_COMBINE_CALLBACK says that the algorithm detected an
  // intersection between two edges in the input data, and the "combine"
  // callback (below) was not provided. No output will be generated.
  //
  // This is the only error that can occur during tesselation and rendering.
  suite('GLU_TESS_NEED_COMBINE_CALLBACK', function() {
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

  // not technically one of the main errors; possibly this should live in
  // basics.test.js
  suite('GLU_INVALID_ENUM', function() {
    test('should throw on setting non-existent property', function() {
      var tess = createTessellator(libtess);
      assert.throw(tess.gluTessProperty.bind(tess,
          libtess.gluEnum.GLU_TESS_MESH, 5), 'GLU_INVALID_ENUM',
          'did not throw GLU_INVALID_ENUM');
    });
    test('should throw on getting non-existent property', function() {
      var tess = createTessellator(libtess);
      assert.throw(tess.gluGetTessProperty.bind(tess,
          libtess.gluEnum.GLU_TESS_END), 'GLU_INVALID_ENUM',
          'did not throw GLU_INVALID_ENUM');
    });
    test('should throw on setting non-existent callback', function() {
      var tess = createTessellator(libtess);
      assert.throw(tess.gluTessCallback.bind(tess,
          libtess.gluEnum.GLU_TESS_TOLERANCE), 'GLU_INVALID_ENUM',
          'did not throw GLU_INVALID_ENUM');
    });
  });

  suite('GLU_INVALID_VALUE', function() {
    test('should throw on invalid winding room', function() {
      var tess = createTessellator(libtess);
      assert.throw(tess.gluTessProperty.bind(tess,
          libtess.gluEnum.GLU_TESS_WINDING_RULE,
          libtess.gluEnum.GLU_TESS_VERTEX_DATA), 'GLU_INVALID_VALUE',
          'did not throw GLU_INVALID_VALUE');
    });
  });

  // TODO(bckenny): These tests just show that the tessellator is properly
  // indicating that it is being deleted while in the middle of building up
  // contours, which makes little sense in the JavaScript port since
  // gluDeleteTess doesn't actually delete anything (there's no memory that
  // needs to be manually freed). If/when we change the public API, these tests
  // will go along with gluDeleteTess.
  suite('gluDeleteTess called while building polygon', function() {
    test('GLU_TESS_MISSING_END_CONTOUR thrown while mid contour', function() {
      var tess = createTessellator(libtess);

      var resultVerts = [];
      tess.gluTessBeginPolygon(resultVerts);
      tess.gluTessBeginContour();
      tess.gluTessVertex([1, 0, 0], [1, 0, 0]);

      assert.throw(tess.gluDeleteTess.bind(tess),
          'GLU_TESS_MISSING_END_CONTOUR',
          'did not throw GLU_TESS_MISSING_END_CONTOUR');
    });
    test('GLU_TESS_MISSING_END_POLYGON thrown between contours', function() {
      var tess = createTessellator(libtess);

      var resultVerts = [];
      tess.gluTessBeginPolygon(resultVerts);
      tess.gluTessBeginContour();
      tess.gluTessVertex([1, 0, 0], [1, 0, 0]);
      tess.gluTessVertex([0, 1, 0], [0, 1, 0]);
      tess.gluTessVertex([0, 0, 0], [0, 0, 0]);
      tess.gluTessEndContour();

      assert.throw(tess.gluDeleteTess.bind(tess),
          'GLU_TESS_MISSING_END_POLYGON',
          'did not throw GLU_TESS_MISSING_END_POLYGON');
    });

  });
});

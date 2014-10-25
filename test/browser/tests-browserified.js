require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"../libtess.min.js":[function(require,module,exports){
/* jshint node: true */

// stub to let the browserified tests use the page-provided libtess
module.exports = window.libtess;

},{}],1:[function(require,module,exports){
/* jshint node: true */
/* global suite, test */
'use strict';

/**
 * Basic tests of the API.
 */

var chai = require('chai');
var assert = chai.assert;

var common = require('./common.js');
var libtess = common.libtess;
var createTessellator = common.createInstrumentedTessellator;

suite('Basic Tests', function() {
  suite('Getting and Setting Properties', function() {
    // NOTE(bckenny): libtess doesn't actually do anything with this value
    test('GLU_TESS_TOLERANCE settable and gettable', function() {
      var tess = createTessellator(libtess);
      var tolerance = 0.5;
      tess.gluTessProperty(libtess.gluEnum.GLU_TESS_TOLERANCE, tolerance);
      var gotTolerance =
          tess.gluGetTessProperty(libtess.gluEnum.GLU_TESS_TOLERANCE);

      assert.strictEqual(gotTolerance, tolerance,
          'GLU_TESS_TOLERANCE did not round trip correctly');
    });
    test('GLU_TESS_WINDING_RULE settable and gettable', function() {
      var tess = createTessellator(libtess);
      var windingRule = libtess.windingRule.GLU_TESS_WINDING_ABS_GEQ_TWO;
      tess.gluTessProperty(libtess.gluEnum.GLU_TESS_WINDING_RULE, windingRule);
      var gotWindingRule =
          tess.gluGetTessProperty(libtess.gluEnum.GLU_TESS_WINDING_RULE);

      assert.strictEqual(gotWindingRule, windingRule,
          'GLU_TESS_WINDING_RULE did not round trip correctly');
    });
    test('GLU_TESS_BOUNDARY_ONLY settable and gettable', function() {
      var tess = createTessellator(libtess);

      var boundaryOnly = true;
      for (var i = 0; i < 2; i++) {
        tess.gluTessProperty(libtess.gluEnum.GLU_TESS_BOUNDARY_ONLY,
            boundaryOnly);
        var gotBoundaryOnly =
            tess.gluGetTessProperty(libtess.gluEnum.GLU_TESS_BOUNDARY_ONLY);
        assert.strictEqual(gotBoundaryOnly, boundaryOnly,
            'GLU_TESS_BOUNDARY_ONLY did not round trip correctly');
        boundaryOnly = !boundaryOnly;
      }
    });
    test('GLU_TESS_MESH callback returns something', function() {
      // TODO(bckenny): returned mesh is useless in minified form. Decide if
      // external mesh interface is worthwhile (can test with checkMesh) or if
      // it should just be hidden within
      var tess = createTessellator(libtess);
      var meshCallbackCalled = false;
      tess.gluTessCallback(libtess.gluEnum.GLU_TESS_MESH,
          function meshCallback(mesh) {
            meshCallbackCalled = true;
            assert.isObject(mesh,
                'GLU_TESS_MESH callback did not return an object');
          });

      var resultVerts = [];
      tess.gluTessBeginPolygon(resultVerts);
      tess.gluTessBeginContour();
      tess.gluTessVertex([1, 0, 0], [1, 0, 0]);
      tess.gluTessVertex([0, 1, 0], [0, 1, 0]);
      tess.gluTessVertex([0, 0, 0], [0, 0, 0]);
      tess.gluTessEndContour();
      tess.gluTessEndPolygon();

      assert.deepEqual(resultVerts, [[1, 0, 0, 0, 1, 0, 0, 0, 0]],
          'triangle was not tessellated to itself in GLU_TESS_MESH test');
      assert.isTrue(meshCallbackCalled,
          'GLU_TESS_MESH callback was not called');
    });
  });

  suite('Basic Geometry', function() {
    test('a single point should return an empty result', function() {
      var tess = createTessellator(libtess);

      var resultVerts = [];
      tess.gluTessBeginPolygon(resultVerts);
      tess.gluTessBeginContour();
      tess.gluTessVertex([1, 0, 0], [1, 0, 0]);
      tess.gluTessEndContour();
      tess.gluTessEndPolygon();

      assert.deepEqual(resultVerts, [], 'single point resulted in geometry');
    });
    test('two points should return an empty result', function() {
      var tess = createTessellator(libtess);

      var resultVerts = [];
      tess.gluTessBeginPolygon(resultVerts);
      tess.gluTessBeginContour();
      tess.gluTessVertex([1, 0, 0], [1, 0, 0]);
      tess.gluTessVertex([0, 1, 0], [0, 1, 0]);
      tess.gluTessEndContour();
      tess.gluTessEndPolygon();

      assert.deepEqual(resultVerts, [], 'two points resulted in geometry');
    });
    test('three distinct points should result in itself', function() {
      var tess = createTessellator(libtess);

      var resultVerts = [];
      tess.gluTessBeginPolygon(resultVerts);
      tess.gluTessBeginContour();
      tess.gluTessVertex([1, 0, 0], [1, 0, 0]);
      tess.gluTessVertex([0, 1, 0], [0, 1, 0]);
      tess.gluTessVertex([0, 0, 0], [0, 0, 0]);
      tess.gluTessEndContour();
      tess.gluTessEndPolygon();

      assert.deepEqual(resultVerts, [[1, 0, 0, 0, 1, 0, 0, 0, 0]],
          'triangle was not tessellated to itself');
    });
  });

  suite('Degenerate Geometry', function() {
    test('triangle with collapsed edge should return empty result', function() {
      var tess = createTessellator(libtess);

      var resultVerts = [];
      tess.gluTessBeginPolygon(resultVerts);
      tess.gluTessBeginContour();
      tess.gluTessVertex([1, 0, 0], [1, 0, 0]);
      tess.gluTessVertex([0, 1, 0], [0, 1, 0]);
      tess.gluTessVertex([0, 1, 0], [0, 1, 0]);
      tess.gluTessEndContour();
      tess.gluTessEndPolygon();

      assert.deepEqual(resultVerts, [],
          'degenerate triangle resulted in geometry');
    });
    test('triangle collapsed to point should return empty result', function() {
      var tess = createTessellator(libtess);

      var resultVerts = [];
      tess.gluTessBeginPolygon(resultVerts);
      tess.gluTessBeginContour();
      tess.gluTessVertex([1, 0, 0], [1, 0, 0]);
      tess.gluTessVertex([1, 0, 0], [1, 0, 0]);
      tess.gluTessVertex([1, 0, 0], [1, 0, 0]);
      tess.gluTessEndContour();
      tess.gluTessEndPolygon();

      assert.deepEqual(resultVerts, [],
          'degenerate triangle resulted in geometry');
    });
  });
});

},{"./common.js":5,"chai":undefined}],2:[function(require,module,exports){
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
    //       'tessellation incorrect after GLU_TESS_MISSING_END_POLYGON error');
    // });
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
    test('should throw on out-of-range tolerance', function() {
      var tess = createTessellator(libtess);
      assert.throw(tess.gluTessProperty.bind(tess,
          libtess.gluEnum.GLU_TESS_TOLERANCE, 1.1), 'GLU_INVALID_VALUE',
          'did not throw GLU_INVALID_VALUE');
      assert.throw(tess.gluTessProperty.bind(tess,
          libtess.gluEnum.GLU_TESS_TOLERANCE, -0.1), 'GLU_INVALID_VALUE',
          'did not throw GLU_INVALID_VALUE');
    });
    test('should throw on invalid winding room', function() {
      var tess = createTessellator(libtess);
      assert.throw(tess.gluTessProperty.bind(tess,
          libtess.gluEnum.GLU_TESS_WINDING_RULE,
          libtess.gluEnum.GLU_TESS_VERTEX_DATA), 'GLU_INVALID_VALUE',
          'did not throw GLU_INVALID_VALUE');
    });
  });
});

},{"./common.js":5,"./geometry/hourglass.js":7,"chai":undefined}],3:[function(require,module,exports){
/* jshint node: true */
/* global suite, test */
'use strict';

var chai = require('chai');
var assert = chai.assert;

var common = require('./common.js');
var libtess = common.libtess;
var createTessellator = common.createInstrumentedTessellator;
var createPlaneRotation = common.createPlaneRotation;

var basetess = require('./expectations/libtess.baseline.js');

var rfolder = require('./rfolder.js');
var geometryFiles = {"hourglass": require("./geometry/hourglass.js"),"two-opposite-triangles": require("./geometry/two-opposite-triangles.js"),"two-traingles": require("./geometry/two-traingles.js")};
var geometries = Object.keys(geometryFiles).map(function(filename) {
  return geometryFiles[filename];
});

/**
 * Enumeration of supported winding rules.
 * @private {!Array.<{name: string, value: boolean}>}
 * @const
 */
var WINDING_RULES = Object.keys(libtess.windingRule).map(
  function(windingRuleName) {
    return {
      name: windingRuleName.substring(9),
      value: libtess.windingRule[windingRuleName]
    };
  });

/**
 * Set of normals for planes in which to test tessellation.
 * @private {!Array.<{name: string, value: !Array.<number>}>}
 * @const
 */
var NORMALS = [
  {
    name: 'xyPlane',
    value: [0, 0, 1],
  },
  {
    name: 'xzPlane',
    value: [0, 1, 0],
  },
  {
    name: 'yzPlane',
    value: [1, 0, 0]
  },
  {
    name: 'tiltedPlane',
    value: [Math.SQRT1_2, Math.SQRT1_2, 0]
  }
];

/**
 * Whether to provide a normal to libtess or make it compute one.
 * @private {!Array.<{name: string, value: boolean}>}
 * @const
 */
var PROVIDE_NORMALS = [
  {
    name: 'explicitNormal',
    value: true
  },
  {
    name: 'computedNormal',
    value: false
  }
];

/**
 * Tessellation output types.
 * @private {!Array.<{name: string, value: boolean}>}
 * @const
 */
var OUTPUT_TYPES = [
  {
    name: 'triangulation',
    value: false
  },
  {
    name: 'boundaries',
    value: true
  }
  // TODO(bckenny): check mesh as well?
];

suite('Geometry tests', function() {
  for (var i = 0; i < geometries.length; i++) {
    testGeometry(geometries[i]);
  }
});

/**
 * Tests multiple permutations of options in tessellating the provided geometry
 * contours against a baseline (ostensibly correct) tessellator.
 * @param {{name: string, value: !Array.<!Array.<number>>}} geometry
 */
function testGeometry(geometry) {
  suite(geometry.name, function() {

    OUTPUT_TYPES.forEach(function(outputType) {
      suite(outputType.name, function() {

        PROVIDE_NORMALS.forEach(function(provideNormal) {
          suite('using ' + provideNormal.name, function() {

            NORMALS.forEach(function(normal) {
              suite('in the ' + normal.name, function() {

                WINDING_RULES.forEach(function(windingRule) {

                  var baselineTessellator = createTessellator(basetess,
                      outputType);
                  var expectation = tessellate(baselineTessellator,
                      geometry.value, outputType, provideNormal, normal,
                      windingRule);

                  var testDescription = 'should generate correct ' +
                    outputType.name + ' with winding rule ' + windingRule.name;

                  test(testDescription, function() {
                    var tessellator = createTessellator(libtess, outputType);
                    var result = tessellate(tessellator, geometry.value,
                      outputType, provideNormal, normal, windingRule);

                    assert.isArray(result, 'tessellation result not an array');
                    assert.deepEqual(result, expectation,
                        'tessellation result not as expected');
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

/**
 * Tessellate the polygon made up of contours with the tessellator tess, using
 * the specified options.
 * @param {!libtess.GluTesselator} tess
 * @param {!Array.<!Array.<number>>} contours
 * @param {{name: string, value: boolean}} outputType
 * @param {{name: string, value: boolean}} provideNormal
 * @param {{name: string, value: !Array.<number>}} normal
 * @param {{name: string, value: boolean}} windingRule
 * @return {!Array.<!Array.<number>>}
 */
function tessellate(tess, contours, outputType, provideNormal, normal,
    windingRule) {

  // winding rule
  tess.gluTessProperty(libtess.gluEnum.GLU_TESS_WINDING_RULE,
      windingRule.value);

  // transform function to align plane with desired normal
  var rotate = createPlaneRotation(normal.value);

  // provide normal or compute
  if (provideNormal.value) {
    tess.gluTessNormal.apply(tess, normal.value);
  }

  var resultVerts = [];
  tess.gluTessBeginPolygon(resultVerts);

  for (var i = 0; i < contours.length; i++) {
    tess.gluTessBeginContour();
    var contour = contours[i];
    for (var j = 0; j < contour.length; j += 3) {
      var coords = rotate(contour[j], contour[j + 1], contour[j + 2]);
      tess.gluTessVertex(coords, coords);
    }
    tess.gluTessEndContour();
  }

  tess.gluTessEndPolygon();

  return resultVerts;
}

},{"./common.js":5,"./expectations/libtess.baseline.js":6,"./geometry/hourglass.js":7,"./geometry/two-opposite-triangles.js":8,"./geometry/two-traingles.js":9,"./rfolder.js":4,"chai":undefined}],4:[function(require,module,exports){

},{}],5:[function(require,module,exports){
/* jshint node: true */
'use strict';

var chai = require('chai');
var assert = chai.assert;

// TODO(bckenny): not sure of a better way of doing this yet. Want to inject
// libtess.cat.js for coverage, but libtess.min.js for all other runs.
// gulp-mocha takes file names, though. Write to temp files first?
exports.libtess = (function() {
  if ("browserify" === 'coverage') {
    var libtess = require('../libtess.cat.js');
    // TODO(bckenny): along with better dynamic loading, smooth this as well
    libtess.DEBUG = true;
    return libtess;

  } else {
    return require('../libtess.min.js');
  }
})();

// TODO(bckenny): replace with some destructuring?
/**
 * Lookup table for error types by number.
 * @enum {string}
 * @const
 * @private
 */
var ERROR_TYPES_ = {
  100900: 'GLU_INVALID_ENUM',
  100901: 'GLU_INVALID_VALUE',
  100151: 'GLU_TESS_MISSING_BEGIN_POLYGON',
  100153: 'GLU_TESS_MISSING_END_POLYGON',
  100152: 'GLU_TESS_MISSING_BEGIN_CONTOUR',
  100154: 'GLU_TESS_MISSING_END_CONTOUR',
  100155: 'GLU_TESS_COORD_TOO_LARGE',
  100156: 'GLU_TESS_NEED_COMBINE_CALLBACK'
};
exports.ERROR_TYPES = ERROR_TYPES_;

/**
 * Lookup table for primitive types by number.
 * @enum {string}
 * @const
 * @private
 */
var PRIMITIVE_TYPES_ = {
  2: 'GL_LINE_LOOP',
  4: 'GL_TRIANGLES',
  5: 'GL_TRIANGLE_STRIP',
  6: 'GL_TRIANGLE_FAN'
};
exports.PRIMITIVE_TYPES = PRIMITIVE_TYPES_;

/**
 * Tessellation output types.
 * @private {Array.<{name: string, value: boolean}>}
 * @const
 */
var OUTPUT_TYPES_ = [
  {
    name: 'triangulation',
    value: false
  },
  {
    name: 'boundaries',
    value: true
  }
];

/**
 * Creates a tessellator instance from the injected libtess implementation,
 * with straightforward callbacks that have been instrumented with Chai assert
 * statements. Most of the callbacks can be overridden by simply assigning a new
 * one.
 * @param {libtess} libtess Injected libtess implementation.
 * @param {{name: string, value: boolean}=} opt_outputType
 * @return {!libtess.GluTesselator}
 */
exports.createInstrumentedTessellator = function(libtess, opt_outputType) {
  var outputType = opt_outputType || OUTPUT_TYPES_[0];

  var begun = false;

  function beginCallback(type, vertexArrays) {
    assert.isFalse(begun, 'GLU_TESS_BEGIN without closing the last primitive');
    begun = true;

    if (outputType.value === false) {
      assert.equal(type, libtess.primitiveType.GL_TRIANGLES,
          'GL_TRIANGLES expected but ' + PRIMITIVE_TYPES_[type] +
          ' emitted instead');
    } else {
      assert.equal(type, libtess.primitiveType.GL_LINE_LOOP,
          'GL_LINE_LOOP expected but ' + PRIMITIVE_TYPES_[type] +
          ' emitted instead');
    }

    vertexArrays.push([]);
  }

  function vertexCallback(data, polyVertArray) {
    assert.isTrue(begun, 'GLU_TESS_VERTEX called while not inside a primitive');

    polyVertArray[polyVertArray.length - 1].push(data[0], data[1], data[2]);
  }

  function endCallback() {
    assert.isTrue(begun, 'GLU_TESS_END called while not inside a primitive');
    begun = false;
  }

  function errorCallback(errorNumber) {
    throw new Error(ERROR_TYPES_[errorNumber]);
  }

  function combineCallback(coords, data, weight) {
    assert.isFalse(begun, 'combine called while returning the vertices of a ' +
        'primitive');
    return [coords[0], coords[1], coords[2]];
  }

  function edgeCallback(flag) {
    // TODO(bckenny): assert order of this? useful for boundary outputtype?
  }

  var tess = new libtess.GluTesselator();

  tess.gluTessCallback(libtess.gluEnum.GLU_TESS_BEGIN_DATA, beginCallback);
  tess.gluTessCallback(libtess.gluEnum.GLU_TESS_VERTEX_DATA, vertexCallback);
  tess.gluTessCallback(libtess.gluEnum.GLU_TESS_END, endCallback);

  tess.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR, errorCallback);
  tess.gluTessCallback(libtess.gluEnum.GLU_TESS_COMBINE, combineCallback);
  tess.gluTessCallback(libtess.gluEnum.GLU_TESS_EDGE_FLAG, edgeCallback);

  tess.gluTessProperty(libtess.gluEnum.GLU_TESS_BOUNDARY_ONLY,
      outputType.value);

  return tess;
};

/**
 * Create a rotation function that rotates coordinates from a plane with a z=1
 * normal to a plane with the specified normal. Normal must be unit length.
 * Returned function returns a new array with transformed coordinates.
 * Note: works precisely for normals of z=-1 (treated as rotation around the
 * y-axis by π), but will likely have numerical issues with normals
 * *approaching* z=-1. Don't use this elsewhere.
 * @param {!Array.<number>} normal
 * @return {function(number, number, number): !Array.<number>}
 */
exports.createPlaneRotation = function(normal) {
  var nx = normal[0];
  var ny = normal[1];
  var nz = normal[2];

  // if normal is negative-z-axis aligned, special case it
  if (nx === 0 && ny === 0 && nz === -1) {
    return function(x, y, z) {
      return [-x, y, -z];
    };
  }

  // arbitrary normal, hopefully not too near nz = -1
  var denom = 1 + nz;
  var transform = [
    nz + ny * ny / denom, -nx * ny / denom, -nx,
    -nx * ny / denom, nz + nx * nx / denom, -ny,
    nx, ny, nz
  ];

  return (function(transform) {
    return function(x, y, z) {
      return [
        transform[0] * x + transform[3] * y + transform[6] * z,
        transform[1] * x + transform[4] * y + transform[7] * z,
        transform[2] * x + transform[5] * y + transform[8] * z
      ];
    };
  })(transform);
};

},{"../libtess.cat.js":undefined,"../libtess.min.js":undefined,"chai":undefined}],6:[function(require,module,exports){
/*

 Copyright 2000, Silicon Graphics, Inc. All Rights Reserved.
 Copyright 2014, Google Inc. All Rights Reserved.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to
 deal in the Software without restriction, including without limitation the
 rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 sell copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice including the dates of first publication and
 either this permission notice or a reference to http://oss.sgi.com/projects/FreeB/
 shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 SILICON GRAPHICS, INC. BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
 IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 Original Code. The Original Code is: OpenGL Sample Implementation,
 Version 1.2.1, released January 26, 2000, developed by Silicon Graphics,
 Inc. The Original Code is Copyright (c) 1991-2000 Silicon Graphics, Inc.
 Copyright in any portions created by third parties is as indicated
 elsewhere herein. All Rights Reserved.
*/
'use strict';var m;function s(a,b){return a.b===b.b&&a.a===b.a}function t(a,b){return a.b<b.b||a.b===b.b&&a.a<=b.a}function u(a,b,c){var d,e;d=b.b-a.b;e=c.b-b.b;return 0<d+e?d<e?b.a-a.a+d/(d+e)*(a.a-c.a):b.a-c.a+e/(d+e)*(c.a-a.a):0}function w(a,b,c){var d,e;d=b.b-a.b;e=c.b-b.b;return 0<d+e?(b.a-c.a)*d+(b.a-a.a)*e:0}function x(a,b){return a.a<b.a||a.a===b.a&&a.b<=b.b}function aa(a,b,c){var d,e;d=b.a-a.a;e=c.a-b.a;return 0<d+e?d<e?b.b-a.b+d/(d+e)*(a.b-c.b):b.b-c.b+e/(d+e)*(c.b-a.b):0}
function ba(a,b,c){var d,e;d=b.a-a.a;e=c.a-b.a;return 0<d+e?(b.b-c.b)*d+(b.b-a.b)*e:0}function ca(a){return t(z(a),a.a)}function da(a){return t(a.a,z(a))}function A(a,b,c,d){a=0>a?0:a;c=0>c?0:c;return a<=c?0===c?(b+d)/2:b+a/(a+c)*(d-b):d+c/(a+c)*(b-d)};function ea(a){var b=fa(a.b);B(b,a.c);B(b.b,a.c);C(b,a.a);return b}function D(a,b){var c=!1,d=!1;a!==b&&(b.a!==a.a&&(d=!0,E(b.a,a.a)),b.c!==a.c&&(c=!0,F(b.c,a.c)),G(b,a),d||(B(b,a.a),a.a.c=a),c||(C(b,a.c),a.c.b=a))}function H(a){var b=a.b,c=!1;a.c!==I(a)&&(c=!0,F(a.c,I(a)));a.d===a?E(a.a,null):(I(a).b=J(a),a.a.c=a.d,G(a,J(a)),c||C(a,a.c));b.d===b?(E(b.a,null),F(b.c,null)):(a.c.b=J(b),b.a.c=b.d,G(b,J(b)));ga(a)}
function K(a){var b=fa(a),c=b.b;G(b,a.e);b.a=z(a);B(c,b.a);b.c=c.c=a.c;b=b.b;G(a.b,J(a.b));G(a.b,b);a.b.a=b.a;z(b).c=b.b;b.b.c=I(a);b.g=a.g;b.b.g=a.b.g;return b}function L(a,b){var c=!1,d=fa(a),e=d.b;b.c!==a.c&&(c=!0,F(b.c,a.c));G(d,a.e);G(e,b);d.a=z(a);e.a=b.a;d.c=e.c=a.c;a.c.b=e;c||C(d,a.c);return d}function fa(a){var b=new M,c=new M,d=a.b.i;c.i=d;d.b.i=b;b.i=a;a.b.i=c;b.b=c;b.d=b;b.e=c;c.b=b;c.d=c;return c.e=b}function G(a,b){var c=a.d,d=b.d;c.b.e=b;d.b.e=a;a.d=d;b.d=c}
function B(a,b){var c=b.g,d=new ha(b,c);c.e=d;b.g=d;c=d.c=a;do c.a=d,c=c.d;while(c!==a)}function C(a,b){var c=b.g,d=new ia(b,c);c.a=d;b.g=d;d.b=a;d.c=b.c;c=a;do c.c=d,c=c.e;while(c!==a)}function ga(a){var b=a.i;a=a.b.i;b.b.i=a;a.b.i=b}function E(a,b){var c=a.c,d=c;do d.a=b,d=d.d;while(d!==c);c=a.g;d=a.e;d.g=c;c.e=d}function F(a,b){var c=a.b,d=c;do d.c=b,d=d.e;while(d!==c);c=a.g;d=a.a;d.g=c;c.a=d};function ja(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}function ka(a){var b=0;Math.abs(a[1])>Math.abs(a[0])&&(b=1);Math.abs(a[2])>Math.abs(a[b])&&(b=2);return b};function la(a){if(3>a.c)return!0;var b=[0,0,0];b[0]=a.i[0];b[1]=a.i[1];b[2]=a.i[2];0===b[0]&&0===b[1]&&0===b[2]&&ma(a,b,!1);var c=ma(a,b,!0);if(2===c)return!1;if(0===c)return!0;switch(a.B){case 100132:if(0>c)return!0;break;case 100133:if(0<c)return!0;break;case 100134:return!0}N(a,a.n?2:3<a.c?6:4);b=0+a.c;O(a,a.g[0].a);if(0<c)for(c=1;c<b;++c)O(a,a.g[c].a);else for(c=b-1;0<c;--c)O(a,a.g[c].a);P(a);return!0}function Q(a){return!a.c||a.d}function na(a){for(;null!==a;)a.d=!1,a=a.e}
function oa(a){var b=new pa(0,null,qa),c=null,d;for(d=a;!Q(d.c);d=d.d)d.c.e=c,c=d.c,d.c.d=!0,++b.a;for(d=a;!Q(I(d));d=J(d))I(d).e=c,c=I(d),I(d).d=!0,++b.a;b.b=d;na(c);return b}
function ra(a){var b=new pa(0,null,sa),c=0,d=0,e=null,f,g;for(f=a;!Q(f.c);++d,f=f.d){f.c.e=e;e=f.c;f.c.d=!0;++d;f=f.e.b;if(Q(f.c))break;f.c.e=e;e=f.c;f.c.d=!0}g=f;for(f=a;!Q(I(f));++c,f=f.b.d.b){I(f).e=e;e=I(f);I(f).d=!0;++c;f=J(f);if(Q(I(f)))break;I(f).e=e;e=I(f);I(f).d=!0}a=f;b.a=d+c;0===(d&1)?b.b=g.b:0===(c&1)?b.b=a:(--b.a,b.b=a.d);na(e);return b}function qa(a,b,c){N(a,6);O(a,b.a.d);for(O(a,z(b).d);!Q(b.c);)b.c.d=!0,--c,b=b.d,O(a,z(b).d);P(a)}
function sa(a,b,c){N(a,5);O(a,b.a.d);for(O(a,z(b).d);!Q(b.c);){b.c.d=!0;--c;b=b.e.b;O(a,b.a.d);if(Q(b.c))break;b.c.d=!0;--c;b=b.d;O(a,z(b).d)}P(a)}function ta(a,b){b.c.e=a.m;a.m=b.c;b.c.d=!0}
function ma(a,b,c){c||(b[0]=b[1]=b[2]=0);for(var d=0+a.c,e=1,f=a.g[0],g=a.g[e],n=g.f[0]-f.f[0],l=g.f[1]-f.f[1],k=g.f[2]-f.f[2],h=0;++e<d;){var g=a.g[e],p=n,r=l,v=k,n=g.f[0]-f.f[0],l=g.f[1]-f.f[1],k=g.f[2]-f.f[2],g=[0,0,0];g[0]=r*k-v*l;g[1]=v*n-p*k;g[2]=p*l-r*n;p=g[0]*b[0]+g[1]*b[1]+g[2]*b[2];if(!c)0<=p?(b[0]+=g[0],b[1]+=g[1],b[2]+=g[2]):(b[0]-=g[0],b[1]-=g[1],b[2]-=g[2]);else if(0!==p)if(0<p){if(0>h)return 2;h=1}else{if(0<h)return 2;h=-1}}return h};var R=4*1E150;function ua(a,b){a.g+=b.g;a.b.g+=b.b.g}function va(a,b,c){a=a.a;b=b.h;c=c.h;if(z(b)===a)return z(c)===a?t(b.a,c.a)?0>=w(z(c),b.a,c.a):0<=w(z(b),c.a,b.a):0>=w(z(c),a,c.a);if(z(c)===a)return 0<=w(z(b),a,b.a);b=u(z(b),a,b.a);a=u(z(c),a,c.a);return b>=a}function S(a){a.h.j=null;var b=a.d;b.a.c=b.c;b.c.a=b.a;a.d=null}function wa(a,b){H(a.h);a.b=!1;a.h=b;b.j=a}function xa(a){var b=a.h.a;do a=T(a);while(a.h.a===b);a.b&&(b=L(U(a).h.b,a.h.e),wa(a,b),a=T(a));return a}
function ya(a){var b=z(a.h);do a=T(a);while(z(a.h)===b);return a}function za(a,b,c){var d=new Aa;d.h=c;d.d=Ba(a.k,b.d,d);return c.j=d}function Ca(a,b){switch(a.B){case 100130:return 0!==(b&1);case 100131:return 0!==b;case 100132:return 0<b;case 100133:return 0>b;case 100134:return 2<=b||-2>=b}return!1}function Da(a){var b=a.h,c=b.c;c.c=a.c;c.b=b;S(a)}
function V(a,b){for(var c=a,d=a.h;c!==b;){c.b=!1;var e=U(c),f=e.h;if(f.a!==d.a){if(!e.b){Da(c);break}f=L(d.d.b,f.b);wa(e,f)}d.d!==f&&(D(J(f),f),D(d,f));Da(c);d=e.h;c=e}return d}function W(a,b,c,d,e,f){var g=!0;do za(a,b,c.b),c=c.d;while(c!==d);for(null===e&&(e=U(b).h.b.d);;){d=U(b);c=d.h.b;if(c.a!==e.a)break;c.d!==e&&(D(J(c),c),D(J(e),c));d.e=b.e-c.g;d.c=Ca(a,d.e);b.a=!0;!g&&Ea(a,b)&&(ua(c,e),S(b),H(e));g=!1;b=d;e=c}b.a=!0;f&&Fa(a,b)}
function Ga(a,b,c,d,e){var f=[b.f[0],b.f[1],b.f[2]];b.d=null;var g;a.C?g=a.C(f,c,d,a.d):a.D&&(g=a.D(f,c,d));void 0===g&&(g=null);b.d=g;null===b.d&&(e?a.A||(X(a,100156),a.A=!0):b.d=c[0])}function Y(a,b,c){var d=[null,null,null,null];d[0]=b.a.d;d[1]=c.a.d;Ga(a,b.a,d,[.5,.5,0,0],!1);D(b,c)}
function Ha(a,b,c,d,e){var f=Math.abs(b.b-a.b)+Math.abs(b.a-a.a),g=Math.abs(c.b-a.b)+Math.abs(c.a-a.a),n=e+1;d[e]=.5*g/(f+g);d[n]=.5*f/(f+g);a.f[0]+=d[e]*b.f[0]+d[n]*c.f[0];a.f[1]+=d[e]*b.f[1]+d[n]*c.f[1];a.f[2]+=d[e]*b.f[2]+d[n]*c.f[2]}
function Ea(a,b){var c=U(b),d=b.h,e=c.h;if(t(d.a,e.a)){if(0<w(z(e),d.a,e.a))return!1;if(!s(d.a,e.a))K(e.b),D(d,J(e)),b.a=c.a=!0;else if(d.a!==e.a){var c=a.j,f=d.a.i;if(0<=f){var c=c.b,g=c.c,n=c.a,l=n[f].b;g[l].a=g[c.b].a;n[g[l].a].b=l;l<=--c.b&&(1>=l||c.g(n[g[l>>1].a].a,n[g[l].a].a)?Ia(c,l):Ja(c,l));n[f].a=null;n[f].b=c.d;c.d=f}else for(c.c[-(f+1)]=null;0<c.a&&null===c.c[c.d[c.a-1]];)--c.a;Y(a,J(e),d)}}else{if(0>w(z(d),e.a,d.a))return!1;T(b).a=b.a=!0;K(d.b);D(J(e),d)}return!0}
function Ka(a,b){var c=U(b),d=b.h,e=c.h,f=d.a,g=e.a,n=z(d),l=z(e),k=new ha;w(n,a.a,f);w(l,a.a,g);if(f===g||Math.min(f.a,n.a)>Math.max(g.a,l.a))return!1;if(t(f,g)){if(0<w(l,f,g))return!1}else if(0>w(n,g,f))return!1;var h=n,p=f,r=l,v=g,q,y;t(h,p)||(q=h,h=p,p=q);t(r,v)||(q=r,r=v,v=q);t(h,r)||(q=h,h=r,r=q,q=p,p=v,v=q);t(r,p)?t(p,v)?(q=u(h,r,p),y=u(r,p,v),0>q+y&&(q=-q,y=-y),k.b=A(q,r.b,y,p.b)):(q=w(h,r,p),y=-w(h,v,p),0>q+y&&(q=-q,y=-y),k.b=A(q,r.b,y,v.b)):k.b=(r.b+p.b)/2;x(h,p)||(q=h,h=p,p=q);x(r,v)||
(q=r,r=v,v=q);x(h,r)||(q=h,h=r,r=q,q=p,p=v,v=q);x(r,p)?x(p,v)?(q=aa(h,r,p),y=aa(r,p,v),0>q+y&&(q=-q,y=-y),k.a=A(q,r.a,y,p.a)):(q=ba(h,r,p),y=-ba(h,v,p),0>q+y&&(q=-q,y=-y),k.a=A(q,r.a,y,v.a)):k.a=(r.a+p.a)/2;t(k,a.a)&&(k.b=a.a.b,k.a=a.a.a);h=t(f,g)?f:g;t(h,k)&&(k.b=h.b,k.a=h.a);if(s(k,f)||s(k,g))return Ea(a,b),!1;if(!s(n,a.a)&&0<=w(n,a.a,k)||!s(l,a.a)&&0>=w(l,a.a,k)){if(l===a.a)return K(d.b),D(e.b,d),b=xa(b),d=U(b).h,V(U(b),c),W(a,b,J(d),d,d,!0),!0;if(n===a.a)return K(e.b),D(d.e,J(e)),c=b,b=ya(b),
f=U(b).h.b.d,c.h=J(e),e=V(c,null),W(a,b,e.d,d.b.d,f,!0),!0;0<=w(n,a.a,k)&&(T(b).a=b.a=!0,K(d.b),d.a.b=a.a.b,d.a.a=a.a.a);0>=w(l,a.a,k)&&(b.a=c.a=!0,K(e.b),e.a.b=a.a.b,e.a.a=a.a.a);return!1}K(d.b);K(e.b);D(J(e),d);d.a.b=k.b;d.a.a=k.a;d.a.i=La(a.j,d.a);d=d.a;e=[0,0,0,0];k=[f.d,n.d,g.d,l.d];d.f[0]=d.f[1]=d.f[2]=0;Ha(d,f,n,e,0);Ha(d,g,l,e,2);Ga(a,d,k,e,!0);T(b).a=b.a=c.a=!0;return!1}
function Fa(a,b){for(var c=U(b);;){for(;c.a;)b=c,c=U(c);if(!b.a&&(c=b,b=T(b),null===b||!b.a))break;b.a=!1;var d=b.h,e=c.h,f;if(f=z(d)!==z(e))a:{f=b;var g=U(f),n=f.h,l=g.h,k=void 0;if(t(z(n),z(l))){if(0>w(z(n),z(l),n.a)){f=!1;break a}T(f).a=f.a=!0;k=K(n);D(l.b,k);k.c.c=f.c}else{if(0<w(z(l),z(n),l.a)){f=!1;break a}f.a=g.a=!0;k=K(l);D(n.e,l.b);I(k).c=f.c}f=!0}f&&(c.b?(S(c),H(e),c=U(b),e=c.h):b.b&&(S(b),H(d),b=T(c),d=b.h));if(d.a!==e.a)if(z(d)===z(e)||b.b||c.b||z(d)!==a.a&&z(e)!==a.a)Ea(a,b);else if(Ka(a,
b))break;d.a===e.a&&z(d)===z(e)&&(ua(e,d),S(b),H(d),b=T(c))}}
function Ma(a,b){a.a=b;for(var c=b.c;null===c.j;)if(c=c.d,c===b.c){var c=a,d=b,e=new Aa;e.h=d.c.b;var f=c.k,g=f.a;do g=g.a;while(null!==g.b&&!f.c(f.b,e,g.b));var f=g.b,n=U(f),e=f.h,g=n.h;if(0===w(z(e),d,e.a))if(e=f.h,s(e.a,d))Y(c,e,d.c);else if(s(z(e),d)){var f=ya(f),e=U(f),g=e.h.b,l=n=g.d;e.b&&(S(e),H(g),g=J(n));D(d.c,g);ca(n)||(n=null);W(c,f,g.d,l,n,!0)}else K(e.b),f.b&&(H(e.d),f.b=!1),D(d.c,e),Ma(c,d);else l=t(z(g),z(e))?f:n,n=void 0,f.c||l.b?(l===f?n=L(d.c.b,e.e):n=L(g.b.d.b,d.c).b,l.b?wa(l,n):
(e=c,f=za(c,f,n),f.e=T(f).e+f.h.g,f.c=Ca(e,f.e)),Ma(c,d)):W(c,f,d.c,d.c,null,!0);return}c=xa(c.j);e=U(c);f=e.h;e=V(e,null);if(e.d===f){var f=e,e=f.d,g=U(c),n=c.h,l=g.h,k=!1;z(n)!==z(l)&&Ka(a,c);s(n.a,a.a)&&(D(J(e),n),c=xa(c),e=U(c).h,V(U(c),g),k=!0);s(l.a,a.a)&&(D(f,J(l)),f=V(g,null),k=!0);k?W(a,c,f.d,e,e,!0):(t(l.a,n.a)?d=J(l):d=n,d=L(f.d.b,d),W(a,c,d,d.d,d.d,!1),d.b.j.b=!0,Fa(a,c))}else W(a,c,e.d,f,f,!0)}
function Na(a,b){var c=new Aa,d=ea(a.b);d.a.b=R;d.a.a=b;z(d).b=-R;z(d).a=b;a.a=z(d);c.h=d;c.e=0;c.c=!1;c.b=!1;c.g=!0;c.a=!1;d=a.k;d=Ba(d,d.a,c);c.d=d};function Oa(a){this.a=new Pa;this.a.a=this.a;this.a.c=this.a;this.b=a;this.c=va}function Ba(a,b,c){do b=b.c;while(null!==b.b&&!a.c(a.b,b.b,c));a=new Pa;a.b=c;a.a=b.a;b.a.c=a;a.c=b;return b.a=a};function Pa(){this.c=this.a=this.b=null};function Qa(){this.f=[0,0,0];this.a=null};function Z(){this.e=0;this.G=this.b=this.p=null;this.i=[0,0,0];this.L=[0,0,0];this.l=[0,0,0];this.H=0;this.B=100130;this.A=!1;this.D=this.a=this.j=this.k=null;this.n=this.o=!1;this.d=this.C=this.F=this.u=this.x=this.s=this.q=this.w=this.v=this.y=this.t=this.r=this.m=null;this.z=!1;this.c=0;this.g=Array(100);for(var a=0;100>a;a++)this.g[a]=new Qa}m=Z.prototype;m.M=function(){$(this,0)};
m.R=function(a,b){switch(a){case 100142:if(0>b||1<b)break;this.H=b;return;case 100140:switch(b){case 100130:case 100131:case 100132:case 100133:case 100134:this.B=b;return}break;case 100141:this.n=!!b;return;default:X(this,100900);return}X(this,100901)};m.N=function(a){switch(a){case 100142:return this.H;case 100140:return this.B;case 100141:return this.n;default:X(this,100900)}return!1};m.Q=function(a,b,c){this.i[0]=a;this.i[1]=b;this.i[2]=c};
m.O=function(a,b){var c=b?b:null;switch(a){case 100100:this.r=c;break;case 100106:this.q=c;break;case 100104:this.t=c;this.o=!!c;break;case 100110:this.s=c;this.o=!!c;break;case 100101:this.y=c;break;case 100107:this.x=c;break;case 100102:this.v=c;break;case 100108:this.u=c;break;case 100103:this.G=c;break;case 100109:this.F=c;break;case 100105:this.D=c;break;case 100111:this.C=c;break;case 100112:this.w=c;break;default:X(this,100900)}};
m.S=function(a,b){var c=!1,d=[0,0,0];$(this,2);this.z&&(Ra(this),this.p=null);for(var e=0;3>e;++e){var f=a[e];-1E150>f&&(f=-1E150,c=!0);1E150<f&&(f=1E150,c=!0);d[e]=f}c&&X(this,100155);if(null===this.b){if(100>this.c){c=this.g[this.c];c.a=b;c.f[0]=d[0];c.f[1]=d[1];c.f[2]=d[2];++this.c;return}Ra(this)}Sa(this,d,b)};m.J=function(a){$(this,0);this.e=1;this.c=0;this.z=!1;this.b=null;this.d=a};m.I=function(){$(this,1);this.e=2;this.p=null;0<this.c&&(this.z=!0)};m.K=function(){$(this,2);this.e=1};
m.P=function(){$(this,1);this.e=0;if(null===this.b){if(!this.o&&!this.w&&la(this)){this.d=null;return}Ra(this)}var a=!1,b=[0,0,0];b[0]=this.i[0];b[1]=this.i[1];b[2]=this.i[2];if(0===b[0]&&0===b[1]&&0===b[2]){var c=[0,0,0],d=[0,0,0],a=[0,0,0],e=[0,0,0],f=[0,0,0];c[0]=c[1]=c[2]=-2*1E150;d[0]=d[1]=d[2]=2*1E150;var g=Array(3),n=Array(3),l,k,h=this.b.c;for(k=h.e;k!==h;k=k.e)for(l=0;3>l;++l){var p=k.f[l];p<d[l]&&(d[l]=p,n[l]=k);p>c[l]&&(c[l]=p,g[l]=k)}l=0;c[1]-d[1]>c[0]-d[0]&&(l=1);c[2]-d[2]>c[l]-d[l]&&
(l=2);if(d[l]>=c[l])b[0]=0,b[1]=0,b[2]=1;else{c=0;k=n[l];g=g[l];a[0]=k.f[0]-g.f[0];a[1]=k.f[1]-g.f[1];a[2]=k.f[2]-g.f[2];for(k=h.e;k!==h;k=k.e)e[0]=k.f[0]-g.f[0],e[1]=k.f[1]-g.f[1],e[2]=k.f[2]-g.f[2],f[0]=a[1]*e[2]-a[2]*e[1],f[1]=a[2]*e[0]-a[0]*e[2],f[2]=a[0]*e[1]-a[1]*e[0],l=f[0]*f[0]+f[1]*f[1]+f[2]*f[2],l>c&&(c=l,b[0]=f[0],b[1]=f[1],b[2]=f[2]);0>=c&&(b[0]=b[1]=b[2]=0,b[ka(a)]=1)}a=!0}e=this.L;f=this.l;h=ka(b);e[h]=0;e[(h+1)%3]=1;e[(h+2)%3]=0;f[h]=0;f[(h+1)%3]=0<b[h]?-0:0;f[(h+2)%3]=0<b[h]?1:-1;
b=this.b.c;for(h=b.e;h!==b;h=h.e)h.b=ja(h.f,e),h.a=ja(h.f,f);if(a){b=0;a=this.b.a;for(e=a.a;e!==a;e=e.a)if(f=e.b,!(0>=f.g)){do b+=(f.a.b-z(f).b)*(f.a.a+z(f).a),f=f.e;while(f!==e.b)}if(0>b){b=this.b.c;for(a=b.e;a!==b;a=a.e)a.a=-a.a;this.l[0]=-this.l[0];this.l[1]=-this.l[1];this.l[2]=-this.l[2]}}this.A=!1;b=this.b.b;for(e=b.i;e!==b;e=a)if(a=e.i,f=e.e,s(e.a,z(e))&&e.e.e!==e&&(Y(this,f,e),H(e),e=f,f=e.e),f.e===e){if(f!==e){if(f===a||f===a.b)a=a.i;H(f)}if(e===a||e===a.b)a=a.i;H(e)}this.j=b=new Ta;a=this.b.c;
for(e=a.e;e!==a;e=e.e)e.i=La(b,e);Ua(b);this.k=new Oa(this);Na(this,-R);for(Na(this,R);null!==(b=Va(this.j));){for(;;){a:if(a=this.j,0===a.a)a=Wa(a.b);else{e=a.c[a.d[a.a-1]];if(0!==a.b.b&&(f=Wa(a.b),a.g(f,e))){a=f;break a}a=e}if(null===a||!s(a,b))break;a=Va(this.j);Y(this,b.c,a.c)}Ma(this,b)}this.a=this.k.a.a.b.h.a;for(b=0;null!==(a=this.k.a.a.b);)a.g||++b,S(a);this.k=null;b=this.j;a=b.b;a.a=null;a.c=null;b.b=null;b.d=null;this.j=b.c=null;b=this.b;for(e=b.a.a;e!==b.a;e=a)a=e.a,e=e.b,e.e.e===e&&(ua(e.d,
e),H(e));if(!this.A){if(this.n)for(b=this.b,e=b.b.i;e!==b.b;e=a)a=e.i,I(e).c!==e.c.c?e.g=e.c.c?1:-1:H(e);else for(b=this.b,e=b.a.a;e!==b.a;e=a)if(a=e.a,e.c){for(e=e.b;t(z(e),e.a);e=e.d.b);for(;t(e.a,z(e));e=e.e);f=e.d.b;for(h=void 0;e.e!==f;)if(t(z(e),f.a)){for(;f.e!==e&&(ca(f.e)||0>=w(f.a,z(f),z(f.e)));)h=L(f.e,f),f=h.b;f=f.d.b}else{for(;f.e!==e&&(da(e.d.b)||0<=w(z(e),e.a,e.d.b.a));)h=L(e,e.d.b),e=h.b;e=e.e}for(;f.e.e!==e;)h=L(f.e,f),f=h.b}if(this.r||this.v||this.y||this.t||this.q||this.u||this.x||
this.s)if(this.n)for(b=this.b,a=b.a.a;a!==b.a;a=a.a){if(a.c){N(this,2);e=a.b;do O(this,e.a.d),e=e.e;while(e!==a.b);P(this)}}else{b=this.b;this.m=null;for(a=b.a.a;a!==b.a;a=a.a)a.d=!1;for(a=b.a.a;a!==b.a;a=a.a)a.c&&!a.d&&(e=a.b,f=new pa(1,e,ta),h=void 0,this.o||(h=oa(e),h.a>f.a&&(f=h),h=oa(e.e),h.a>f.a&&(f=h),h=oa(e.d.b),h.a>f.a&&(f=h),h=ra(e),h.a>f.a&&(f=h),h=ra(e.e),h.a>f.a&&(f=h),h=ra(e.d.b),h.a>f.a&&(f=h)),f.c(this,f.b,f.a));if(null!==this.m){b=-1;a=this.m;for(N(this,4);null!==a;a=a.e){e=a.b;do this.o&&
(f=I(e).c?0:1,b!==f&&(b=f,f=!!b,this.s?this.s(f,this.d):this.t&&this.t(f))),O(this,e.a.d),e=e.e;while(e!==a.b)}P(this);this.m=null}}if(this.w){b=this.b;for(e=b.a.a;e!==b.a;e=a)if(a=e.a,!e.c){f=e.b;h=f.e;k=void 0;do k=h,h=k.e,k.c=null,null===I(k)&&(k.d===k?E(k.a,null):(k.a.c=k.d,G(k,J(k))),g=k.b,g.d===g?E(g.a,null):(g.a.c=g.d,G(g,J(g))),ga(k));while(k!==f);f=e.g;e=e.a;e.g=f;f.a=e}this.w(this.b);this.d=this.b=null;return}}this.b=this.d=null};
function $(a,b){if(a.e!==b)for(;a.e!==b;)if(a.e<b)switch(a.e){case 0:X(a,100151);a.J(null);break;case 1:X(a,100152),a.I()}else switch(a.e){case 2:X(a,100154);a.K();break;case 1:X(a,100153);var c=a;c.e=0;c.p=null;c.b=null}}function Sa(a,b,c){var d=a.p;null===d?(d=ea(a.b),D(d,d.b)):(K(d),d=d.e);d.a.d=c;d.a.f[0]=b[0];d.a.f[1]=b[1];d.a.f[2]=b[2];d.g=1;d.b.g=-1;a.p=d}function Ra(a){a.b=new Xa;for(var b=0;b<a.c;b++){var c=a.g[b];Sa(a,c.f,c.a)}a.c=0;a.z=!1}function N(a,b){a.q?a.q(b,a.d):a.r&&a.r(b)}
function O(a,b){a.x?a.x(b,a.d):a.y&&a.y(b)}function P(a){a.u?a.u(a.d):a.v&&a.v()}function X(a,b){a.F?a.F(b,a.d):a.G&&a.G(b)};function ia(a,b){this.a=a||this;this.g=b||this;this.e=this.b=null;this.c=this.d=!1};function M(){this.i=this;this.j=this.c=this.a=this.e=this.d=this.b=null;this.g=0}function I(a){return a.b.c}function z(a){return a.b.a}function J(a){return a.b.e};function Xa(){this.c=new ha;this.a=new ia;this.b=new M;this.d=new M;this.b.b=this.d;this.d.b=this.b};function ha(a,b){this.e=a||this;this.g=b||this;this.d=this.c=null;this.f=[0,0,0];this.a=this.b=0;this.i=null};function Ya(){this.a=null;this.b=0}function Za(a,b){var c=Array(b),d=0;if(null!==a)for(;d<a.length;d++)c[d]=a[d];for(;d<b;d++)c[d]=new Ya;return c};function $a(){this.a=0}function ab(a,b){var c=Array(b),d=0;if(null!==a)for(;d<a.length;d++)c[d]=a[d];for(;d<b;d++)c[d]=new $a;return c};function Ta(){this.c=bb(null,32);this.d=null;this.a=0;this.e=32;this.i=!1;this.g=t;this.b=new cb(this.g)}function Ua(a){a.d=[];for(var b=0;b<a.a;b++)a.d[b]=b;a.d.sort(function(a,b){return function(e,f){return b(a[e],a[f])?1:-1}}(a.c,a.g));a.e=a.a;a.i=!0;db(a.b)}
function La(a,b){if(a.i){var c=a.b,d=++c.b;2*d>c.e&&(c.e*=2,c.c=ab(c.c,c.e+1),c.a=Za(c.a,c.e+1));var e;0===c.d?e=d:(e=c.d,c.d=c.a[e].b);c.c[d].a=e;c.a[e].b=d;c.a[e].a=b;c.i&&Ja(c,d);return e}c=a.a;++a.a>=a.e&&(a.e*=2,a.c=bb(a.c,a.e));a.c[c]=b;return-(c+1)}function bb(a,b){var c=Array(b),d=0;if(null!==a)for(;d<a.length;d++)c[d]=a[d];for(;d<b;d++)c[d]=null;return c}
function Va(a){if(0===a.a)return eb(a.b);var b=a.c[a.d[a.a-1]];if(0!==a.b.b&&a.g(Wa(a.b),b))return eb(a.b);do--a.a;while(0<a.a&&null===a.c[a.d[a.a-1]]);return b};function cb(a){this.c=ab(null,33);this.a=Za(null,33);this.b=0;this.e=32;this.d=0;this.i=!1;this.g=a;this.c[1].a=1}function db(a){for(var b=a.b;1<=b;--b)Ia(a,b);a.i=!0}function Wa(a){return a.a[a.c[1].a].a}function eb(a){var b=a.c,c=a.a,d=b[1].a,e=c[d].a;0<a.b&&(b[1].a=b[a.b].a,c[b[1].a].b=1,c[d].a=null,c[d].b=a.d,a.d=d,0<--a.b&&Ia(a,1));return e}
function Ia(a,b){for(var c=a.c,d=a.a,e=c[b].a;;){var f=b<<1;f<a.b&&a.g(d[c[f+1].a].a,d[c[f].a].a)&&++f;var g=c[f].a;if(f>a.b||a.g(d[e].a,d[g].a)){c[b].a=e;d[e].b=b;break}c[b].a=g;d[g].b=b;b=f}}function Ja(a,b){for(var c=a.c,d=a.a,e=c[b].a;;){var f=b>>1,g=c[f].a;if(0===f||a.g(d[g].a,d[e].a)){c[b].a=e;d[e].b=b;break}c[b].a=g;d[g].b=b;b=f}};function pa(a,b,c){this.a=a;this.b=b;this.c=c};function Aa(){this.d=this.h=null;this.e=0;this.b=this.a=this.g=this.c=!1}function U(a){return a.d.c.b}function T(a){return a.d.a.b};this.libtess={GluTesselator:Z,windingRule:{GLU_TESS_WINDING_ODD:100130,GLU_TESS_WINDING_NONZERO:100131,GLU_TESS_WINDING_POSITIVE:100132,GLU_TESS_WINDING_NEGATIVE:100133,GLU_TESS_WINDING_ABS_GEQ_TWO:100134},primitiveType:{GL_LINE_LOOP:2,GL_TRIANGLES:4,GL_TRIANGLE_STRIP:5,GL_TRIANGLE_FAN:6},errorType:{GLU_TESS_MISSING_BEGIN_POLYGON:100151,GLU_TESS_MISSING_END_POLYGON:100153,GLU_TESS_MISSING_BEGIN_CONTOUR:100152,GLU_TESS_MISSING_END_CONTOUR:100154,GLU_TESS_COORD_TOO_LARGE:100155,GLU_TESS_NEED_COMBINE_CALLBACK:100156},
gluEnum:{GLU_TESS_MESH:100112,GLU_TESS_TOLERANCE:100142,GLU_TESS_WINDING_RULE:100140,GLU_TESS_BOUNDARY_ONLY:100141,GLU_INVALID_ENUM:100900,GLU_INVALID_VALUE:100901,GLU_TESS_BEGIN:100100,GLU_TESS_VERTEX:100101,GLU_TESS_END:100102,GLU_TESS_ERROR:100103,GLU_TESS_EDGE_FLAG:100104,GLU_TESS_COMBINE:100105,GLU_TESS_BEGIN_DATA:100106,GLU_TESS_VERTEX_DATA:100107,GLU_TESS_END_DATA:100108,GLU_TESS_ERROR_DATA:100109,GLU_TESS_EDGE_FLAG_DATA:100110,GLU_TESS_COMBINE_DATA:100111}};Z.prototype.gluDeleteTess=Z.prototype.M;
Z.prototype.gluTessProperty=Z.prototype.R;Z.prototype.gluGetTessProperty=Z.prototype.N;Z.prototype.gluTessNormal=Z.prototype.Q;Z.prototype.gluTessCallback=Z.prototype.O;Z.prototype.gluTessVertex=Z.prototype.S;Z.prototype.gluTessBeginPolygon=Z.prototype.J;Z.prototype.gluTessBeginContour=Z.prototype.I;Z.prototype.gluTessEndContour=Z.prototype.K;Z.prototype.gluTessEndPolygon=Z.prototype.P; if (typeof module !== 'undefined') { module.exports = this.libtess; }

},{}],7:[function(require,module,exports){
/* jshint node: true */

module.exports = {
  // short self-intersecting single contour
  // bottom of hourglass is anticlockwise, top is clockwise
  'name': 'Hourglass',
  'value': [
    [
      1, 1, 0,
      -1, -1, 0,
      1, -1, 0,
      -1, 1, 0
    ]
  ]
};

},{}],8:[function(require,module,exports){
/* jshint node: true */

module.exports = {
  // two intersecting triangles with opposite winding
  // first is anticlockwise, second is clockwise
  'name': 'Two Opposite Triangles',
  'value': [
    [
      1, -1, 0,
      0, 1, 0,
      -1, -1, 0
    ],
    [
      1, 1, 0,
      0, -1, 0,
      -1, 1, 0
    ]
  ]
};

},{}],9:[function(require,module,exports){
/* jshint node: true */

module.exports = {
  // two intersecting triangles
  // both are anticlockwise (positive winding)
  'name': 'Two Triangles',
  'value': [
    [
      1, -1, 0,
      0, 1, 0,
      -1, -1, 0
    ],
    [
      1, 1, 0,
      -1, 1, 0,
      0, -1, 0
    ]
  ]
};

},{}],"chai":[function(require,module,exports){
/* jshint node: true */

// stub to let the browserified tests use the page-provided Chai
module.exports = window.chai;

},{}]},{},[1,2,3]);

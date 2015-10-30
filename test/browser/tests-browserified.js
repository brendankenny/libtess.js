require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"../libtess.min.js":[function(require,module,exports){
/* jshint node: true */

// stub to let the browserified tests use the page-provided libtess
module.exports = window.libtess;

},{}],1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
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
    // NOTE(bckenny): libtess doesn't do anything with GLU_TESS_TOLERANCE, so
    // merely testing existence to ensure backwards compatibility.
    test('GLU_TESS_TOLERANCE settable and gettable', function() {
      var tess = createTessellator(libtess);
      assert.doesNotThrow(tess.gluTessProperty.bind(tess,
          libtess.gluEnum.GLU_TESS_TOLERANCE, 1),
          'setting GLU_TESS_TOLERANCE threw an error');
      assert.doesNotThrow(tess.gluGetTessProperty.bind(tess,
          libtess.gluEnum.GLU_TESS_TOLERANCE),
          'getting GLU_TESS_TOLERANCE threw an error');
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

  suite('Polygon data and callbacks', function() {
    // Tessellation without data callbacks.
    var noDataVerts = [];
    function vertexCallback(vertData) {
      noDataVerts.push(vertData[0], vertData[1], vertData[2]);
    }
    function combineCallback(coords, vertData, weight) {
      return [coords[0], coords[1], coords[2]];
    }
    var noTess = new libtess.GluTesselator();
    noTess.gluTessCallback(libtess.gluEnum.GLU_TESS_BEGIN, function() {});
    noTess.gluTessCallback(libtess.gluEnum.GLU_TESS_VERTEX, vertexCallback);
    noTess.gluTessCallback(libtess.gluEnum.GLU_TESS_END, function() {});
    noTess.gluTessCallback(libtess.gluEnum.GLU_TESS_COMBINE, combineCallback);
    noTess.gluTessCallback(libtess.gluEnum.GLU_TESS_EDGE_FLAG, function() {});
    noTess.gluTessProperty(libtess.gluEnum.GLU_TESS_BOUNDARY_ONLY, false);
    noTess.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR, function(err) {
      throw new Error(common.ERROR_TYPES_[err]);
    });

    test('correct tessellation with no polygon data callbacks', function() {
      noTess.gluTessBeginPolygon();
      noTess.gluTessBeginContour();
      noTess.gluTessVertex([1, 0, 0], [1, 0, 0]);
      noTess.gluTessVertex([0, 1, 0], [0, 1, 0]);
      noTess.gluTessVertex([1, 1, 0], [1, 1, 0]);
      noTess.gluTessVertex([0, 0, 0], [0, 0, 0]);
      noTess.gluTessEndContour();
      noTess.gluTessEndPolygon();
      assert.deepEqual(noDataVerts,
        [1, 0, 0, 0.5, 0.5, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0.5, 0.5, 0],
        'hourglass was not tessellated correctly in polygon no-data test');
    });

    // Tessellation with data callbacks. Mark if each callback correctly returns
    // polygon data.
    var dataCorrect = {
      begin: null,
      vertex: null,
      edge: null,
      combine: null,
      end: null
    };

    var dataVerts = [];
    function beginDataCallback(type, data) {
      var localDataCorrect = data === dataVerts;
      if (dataCorrect.begin === null) {
        dataCorrect.begin = localDataCorrect;
      } else {
        dataCorrect.begin = dataCorrect.begin && localDataCorrect;
      }
    }
    function vertexDataCallback(vertData, data) {
      var localDataCorrect = data === dataVerts;
      if (dataCorrect.vertex === null) {
        dataCorrect.vertex = localDataCorrect;
      } else {
        dataCorrect.vertex = dataCorrect.vertex && localDataCorrect;
      }

      data.push(vertData[0], vertData[1], vertData[2]);
    }
    function edgeDataCallback(flag, data) {
      var localDataCorrect = data === dataVerts;
      if (dataCorrect.edge === null) {
        dataCorrect.edge = localDataCorrect;
      } else {
        dataCorrect.edge = dataCorrect.edge && localDataCorrect;
      }
    }
    function combineDataCallback(coords, vertData, weight, data) {
      var localDataCorrect = data === dataVerts;
      if (dataCorrect.combine === null) {
        dataCorrect.combine = localDataCorrect;
      } else {
        dataCorrect.combine = dataCorrect.combine && localDataCorrect;
      }

      return [coords[0], coords[1], coords[2]];
    }
    function endDataCallback(data) {
      var localDataCorrect = data === dataVerts;
      if (dataCorrect.end === null) {
        dataCorrect.end = localDataCorrect;
      } else {
        dataCorrect.end = dataCorrect.end && localDataCorrect;
      }
    }

    var tess = new libtess.GluTesselator();
    tess.gluTessCallback(libtess.gluEnum.GLU_TESS_BEGIN_DATA,
        beginDataCallback);
    tess.gluTessCallback(libtess.gluEnum.GLU_TESS_VERTEX_DATA,
        vertexDataCallback);
    tess.gluTessCallback(libtess.gluEnum.GLU_TESS_END_DATA,
        endDataCallback);
    tess.gluTessCallback(libtess.gluEnum.GLU_TESS_COMBINE_DATA,
        combineDataCallback);
    tess.gluTessCallback(libtess.gluEnum.GLU_TESS_EDGE_FLAG_DATA,
        edgeDataCallback);
    tess.gluTessProperty(libtess.gluEnum.GLU_TESS_BOUNDARY_ONLY, false);
    noTess.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR, function(err) {
      throw new Error(common.ERROR_TYPES_[err]);
    });

    test('correct tessellation with polygon data callbacks', function() {
      tess.gluTessBeginPolygon(dataVerts);
      tess.gluTessBeginContour();
      tess.gluTessVertex([1, 0, 0], [1, 0, 0]);
      tess.gluTessVertex([0, 1, 0], [0, 1, 0]);
      tess.gluTessVertex([1, 1, 0], [1, 1, 0]);
      tess.gluTessVertex([0, 0, 0], [0, 0, 0]);
      tess.gluTessEndContour();
      tess.gluTessEndPolygon();

      assert.deepEqual(dataVerts,
        [1, 0, 0, 0.5, 0.5, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0.5, 0.5, 0],
        'hourglass was not tessellated correctly in polygon data test');
    });

    // Check argument counts.
    test('begin callback should correctly return polygon data', function() {
      assert.isTrue(dataCorrect.begin,
          'GLU_TESS_BEGIN_DATA callback called with wrong polygon data');
    });
    test('vertex callback should correctly return polygon data', function() {
      assert.isTrue(dataCorrect.vertex,
          'GLU_TESS_VERTEX_DATA callback called with wrong polygon data');
    });
    test('edge flag callback should correctly return polygon data', function() {
      assert.isTrue(dataCorrect.edge,
          'GLU_TESS_EDGE_FLAG_DATA callback called with wrong polygon data');
    });
    test('combine callback should correctly return polygon data', function() {
      assert.isTrue(dataCorrect.combine,
          'GLU_TESS_COMBINE_DATA callback called with wrong polygon data');
    });
    test('end callback should correctly return polygon data', function() {
      assert.isTrue(dataCorrect.end,
          'GLU_TESS_END_DATA callback called with wrong polygon data');
    });
  });

  suite('Basic Geometry', function() {
    test('no points should return an empty result', function() {
      var tess = createTessellator(libtess);

      var resultVerts = [];
      tess.gluTessBeginPolygon(resultVerts);
      tess.gluTessBeginContour();
      tess.gluTessEndContour();
      tess.gluTessEndPolygon();

      assert.deepEqual(resultVerts, [], 'no points resulted in geometry');
    });
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

},{"./common.js":3,"chai":"chai"}],3:[function(require,module,exports){
(function (global){
/* jshint node: true */
'use strict';

var chai = require('chai');
var assert = chai.assert;

// Load compiled libtess unless a version has been manually injected.
exports.libtess = global._injectedLibtess ?
    global._injectedLibtess : require('../libtess.min.js');

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
exports.OUTPUT_TYPES = OUTPUT_TYPES_;

/**
 * Whether to provide a normal to libtess or make it compute one.
 * @private {!Array.<{name: string, value: boolean}>}
 * @const
 */
var PROVIDE_NORMAL_ = [
  {
    name: 'explicitNormal',
    value: true
  },
  {
    name: 'computedNormal',
    value: false
  }
];
exports.PROVIDE_NORMAL = PROVIDE_NORMAL_;

/**
 * Set of normals for planes in which to test tessellation.
 * @private {!Array.<{name: string, value: !Array.<number>}>}
 * @const
 */
var NORMALS_ = [
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
  // TODO(bckenny): make this transformations instead, so we can test more than
  // just rotations about the origin
];
exports.NORMALS = NORMALS_;

/**
 * Enumeration of supported winding rules.
 * @private {!Array.<{name: string, value: boolean}>}
 * @const
 */
var WINDING_RULES_ = Object.keys(exports.libtess.windingRule).map(
  function(windingRuleName) {
    return {
      name: windingRuleName.substring(9),
      value: exports.libtess.windingRule[windingRuleName]
    };
  });
exports.WINDING_RULES = WINDING_RULES_;

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
exports.tessellate = function(tess, contours, outputType, provideNormal, normal,
    windingRule) {

  // winding rule
  tess.gluTessProperty(exports.libtess.gluEnum.GLU_TESS_WINDING_RULE,
      windingRule.value);

  // transform function to align plane with desired normal
  var rotate = exports.createPlaneRotation(normal.value);

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
  // special case of vector-to-vector rotation matrix from Real-Time Rendering,
  // Third Edition
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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../libtess.min.js":"../libtess.min.js","chai":"chai"}],4:[function(require,module,exports){
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

},{"./common.js":3,"./geometry/hourglass.js":8,"chai":"chai"}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
/* jshint node: true */
/* global suite, test */
'use strict';

/**
 * @fileoverview The tests run by this file generally compare the triangles
 * generated by the current version of libtess against a known-good version.
 * Note that the comparison is currently strict deep equality, meaning that not
 * only must the vertices be found at the exact same floating-point coordinates,
 * but the triangle vertices must be emitted in the exact same order. This
 * limits optimizations to transformations that change neither by design.
 * Optimizations that do change that output must be much more carefully
 * considered in light of the careful design around numerical precision limits.
 */

var chai = require('chai');
var assert = chai.assert;

var common = require('./common.js');
var libtess = common.libtess;
var createTessellator = common.createInstrumentedTessellator;
var tessellate = common.tessellate;

var basetess = require('./expectations/libtess.baseline.js');

// geometry tests are both here and in third_party
var rfolder = require('./rfolder.js');
var geometryFiles = {"degenerate-hourglass": require("./geometry/degenerate-hourglass.js"),"hourglass": require("./geometry/hourglass.js"),"intersection-heavy": require("./geometry/intersection-heavy.js"),"letter-e": require("./geometry/letter-e.js"),"shared-borders": require("./geometry/shared-borders.js"),"shared-edge-triangles": require("./geometry/shared-edge-triangles.js"),"two-opposite-triangles": require("./geometry/two-opposite-triangles.js"),"two-triangles": require("./geometry/two-triangles.js")};
var geometries = Object.keys(geometryFiles).map(function(filename) {
  return geometryFiles[filename];
});
var thirdPartyFiles = {"osm_building": require("./../third_party/test/geometry/osm_building.js"),"osm_nyc_midtown": require("./../third_party/test/geometry/osm_nyc_midtown.js"),"osm_two_buildings": require("./../third_party/test/geometry/osm_two_buildings.js"),"poly2tri-dude": require("./../third_party/test/geometry/poly2tri-dude.js"),"roboto-registered": require("./../third_party/test/geometry/roboto-registered.js")};
var thirdPartyGeometries = Object.keys(thirdPartyFiles).map(function(filename) {
  return thirdPartyFiles[filename];
});
geometries.push.apply(geometries, thirdPartyGeometries);

var OUTPUT_TYPES = common.OUTPUT_TYPES;
var PROVIDE_NORMAL = common.PROVIDE_NORMAL;
var NORMALS = common.NORMALS;
var WINDING_RULES = common.WINDING_RULES;

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

        PROVIDE_NORMAL.forEach(function(provideNormal) {
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

},{"./../third_party/test/geometry/osm_building.js":15,"./../third_party/test/geometry/osm_nyc_midtown.js":16,"./../third_party/test/geometry/osm_two_buildings.js":17,"./../third_party/test/geometry/poly2tri-dude.js":18,"./../third_party/test/geometry/roboto-registered.js":19,"./common.js":3,"./expectations/libtess.baseline.js":5,"./geometry/degenerate-hourglass.js":7,"./geometry/hourglass.js":8,"./geometry/intersection-heavy.js":9,"./geometry/letter-e.js":10,"./geometry/shared-borders.js":11,"./geometry/shared-edge-triangles.js":12,"./geometry/two-opposite-triangles.js":13,"./geometry/two-triangles.js":14,"./rfolder.js":1,"chai":"chai"}],7:[function(require,module,exports){
/* jshint node: true */

module.exports = {
  // self-intersecting contour collapsed to a set of edges
  // should result in no geometry
  name: 'Degenerate Hourglass',
  value: [
    [
      // coincides with intersection of the two main edges
      0, 0, 0,
      1, 1, 0,
      -1, -1, 0,
      // also at the intersection
      0, 0, 0,
      1, -1, 0,
      -1, 1, 0
    ]
  ]
};

},{}],8:[function(require,module,exports){
/* jshint node: true */

module.exports = {
  // short self-intersecting single contour
  // bottom of hourglass is anticlockwise, top is clockwise
  name: 'Hourglass',
  value: [
    [
      1, 1, 0,
      -1, -1, 0,
      1, -1, 0,
      -1, 1, 0
    ]
  ]
};

},{}],9:[function(require,module,exports){
/* jshint node: true */

module.exports = {
  // Intersection heavy geometry for better coverage of intersection handling.
  name: 'Moar Intersections',
  value: [
    [
      1.000, 0.000, 0,
      -1.000, 0.000, 0,
      0.988, 0.156, 0,
      -0.988, -0.156, 0,
      0.951, 0.309, 0,
      -0.951, -0.309, 0,
      0.891, 0.454, 0,
      -0.891, -0.454, 0,
      0.809, 0.588, 0,
      -0.809, -0.588, 0,
      0.707, 0.707, 0,
      -0.707, -0.707, 0,
      0.588, 0.809, 0,
      -0.588, -0.809, 0,
      0.454, 0.891, 0,
      -0.454, -0.891, 0,
      0.309, 0.951, 0,
      -0.309, -0.951, 0,
      0.156, 0.988, 0,
      -0.156, -0.988, 0,
      0.000, 1.000, 0,
      -0.000, -1.000, 0,
      -0.156, 0.988, 0,
      0.156, -0.988, 0,
      -0.309, 0.951, 0,
      0.309, -0.951, 0,
      -0.454, 0.891, 0,
      0.454, -0.891, 0,
      -0.588, 0.809, 0,
      0.588, -0.809, 0,
      -0.707, 0.707, 0,
      0.707, -0.707, 0,
      -0.809, 0.588, 0,
      0.809, -0.588, 0,
      -0.891, 0.454, 0,
      0.891, -0.454, 0,
      -0.951, 0.309, 0,
      0.951, -0.309, 0,
      -0.988, 0.156, 0,
      0.988, -0.156, 0,
    ]
  ]
};

},{}],10:[function(require,module,exports){
/* jshint node: true */

module.exports = {
  // a simple letter E
  // from discussion at http://www.gamedev.net/topic/584914-polygon-tessellationtriangulation-implementations/
  name: 'the letter E',
  value: [
    [
      -128, -23, 0,
      -128, 23, 0,
      -94, 23, 0,
      -94, 15, 0,
      -119, 15, 0,
      -119, 5, 0,
      -96, 5, 0,
      -96, -3, 0,
      -119, -3, 0,
      -119, -15, 0,
      -93, -15, 0,
      -93, -23, 0
    ]
  ]
};

},{}],11:[function(require,module,exports){
/* jshint node: true */

module.exports = {
  // three contours with shared edges but no shared vertices
  name: 'Shared Borders',
  value: [
    // anticlockwise
    [
      1, 3, 0,
      -4, 3, 0,
      -4, -3, 0,
      1, -3, 0
    ],
    // anticlockwise
    [
      3, 1, 0,
      1, 1, 0,
      1, -2, 0
    ],
    // clockwise
    [
      0, 0, 0,
      0, -3, 0,
      -1, -3, 0,
      -1, 0, 0
    ],
    // clockwise
    [
      -2, 3, 0,
      -2, 0, 0,
      // collinear vertex
      0, 0, 0,
      7 / 3, 0, 0,
      5 / 3, -1, 0,
      -3, -1, 0,
      -3, 3, 0
    ]
  ]
};

},{}],12:[function(require,module,exports){
/* jshint node: true */

module.exports = {
  // two triangles with a partially-shared edge
  name: 'Shared-edge triangles',
  value: [
    // anticlockwise
    [
      0, 2, 0,
      5, 2, 0,
      2, 4, 0
    ],
    // clockwise
    [
      1, 2, 0,
      7, 2, 0,
      4, 0, 0
    ]
  ]
};

},{}],13:[function(require,module,exports){
/* jshint node: true */

module.exports = {
  // two intersecting triangles with opposite winding
  // first is anticlockwise, second is clockwise
  name: 'Two Opposite Triangles',
  value: [
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

},{}],14:[function(require,module,exports){
/* jshint node: true */

module.exports = {
  // two intersecting triangles
  // both are anticlockwise (positive winding)
  name: 'Two Triangles',
  value: [
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

},{}],15:[function(require,module,exports){
/**
 * Copyright 2014, OpenStreetMap contributors.
 * Copyright 2014, Mapzen.
 *
 * This data is made available under the Open Database License:
 * http://opendatacommons.org/licenses/odbl/1.0/. Any rights in individual
 * contents of the database are licensed under the Database Contents License:
 * http://opendatacommons.org/licenses/dbcl/1.0/.
 */
/* jshint node: true */

module.exports = {
  // a single building from the from the Mapzen nyc_midtown_14 benchmark data
  // that happens to hit some nice corner cases
  name: 'Mapzen single building - OSM',
  value: [
    [
      1766.3742691542516, -1401.2586967901234, 0,
      1795.4547768888094, -1356.2028538183904, 0,
      1836.465749333181, -1394.6111212094906, 0,
      1848.7690410664927, -1372.2063095273256, 0,
      1934.519256179295, -1425.1407052855038, 0,
      1905.2523349337682, -1478.321134954032, 0,
      1766.3742691542516, -1401.2586967901234, 0
    ],
    [
      1885.3060892444894, -1439.4206524621932, 0,
      1901.151237689331, -1448.284061682003, 0,
      1910.0990862205217, -1431.788268456597, 0,
      1894.4403512897684, -1423.1710564252976, 0,
      1885.3060892444894, -1439.4206524621932, 0
    ],
    [
      1823.91778986799, -1380.8235484254265, 0,
      1876.2999864892688, -1332.8131596033704, 0,
      1934.0881749348869, -1369.0056196450514, 0,
      1897.7375402662997, -1426.6179417774301, 0,
      1823.91778986799, -1380.8235484254265, 0
    ],
    [
      1877.2320540456733, -1399.0428385611244, 0,
      1883.7565269342672, -1402.7359354405016, 0,
      1888.789691735109, -1393.380088398586, 0,
      1882.0788053324268, -1389.9331960377222, 0,
      1877.2320540456733, -1399.0428385611244, 0
    ]
  ]
};

},{}],16:[function(require,module,exports){
/**
 * Copyright 2014, OpenStreetMap contributors.
 * Copyright 2014, Mapzen.
 *
 * This data is made available under the Open Database License:
 * http://opendatacommons.org/licenses/odbl/1.0/. Any rights in individual
 * contents of the database are licensed under the Database Contents License:
 * http://opendatacommons.org/licenses/dbcl/1.0/.
 */
/* jshint node: true */

module.exports = {
  // a selection of polygons that had more than one contour from the Mapzen
  // nyc_midtown_14 benchmark data
  name: 'Mapzen NYC multi-contour z14 - OSM',
  value: [
    [
      2096.372787197828, -1345.1183500196094, 0,
      2123.2163327991984, -1296.3839371665058, 0,
      2222.3883207064473, -1351.5178129820865, 0,
      2195.1719480862585, -1400.2521437142013, 0,
      2096.372787197828, -1345.1183500196094, 0
    ],
    [
      2161.9903431057037, -1363.8244690090687, 0,
      2176.5305969737624, -1371.2084604013044, 0,
      2182.868656352947, -1366.7780657643411, 0,
      2166.8370944002554, -1354.9636771400092, 0,
      2161.9903431057037, -1363.8244690090687, 0
    ],
    [
      2127.3174300436353, -1340.6879518455298, 0,
      2150.4327054193873, -1356.440475944969, 0,
      2155.279456707701, -1348.071948465461, 0,
      2134.773970485515, -1336.25755308505, 0,
      2127.3174300436353, -1340.6879518455298, 0
    ],
    [
      1862.9511367068185, -959.1581256950363, 0,
      1920.3664981289392, -839.0238458980297, 0,
      1962.495951639125, -855.2715406927349, 0,
      1907.6903793736897, -827.69969021369, 0,
      1923.7219413295004, -798.6507511606233, 0,
      2027.74068053442, -856.2562492035164, 0,
      1946.0915626644953, -1004.9468948868741, 0,
      1862.9511367068185, -959.1581256950363, 0
    ],
    [
      1971.0709731561756, -871.0268733905056, 0,
      1977.0362055071837, -874.4733514065634, 0,
      1984.492745952182, -870.5345193565745, 0,
      1976.2905514633076, -861.6721455137506, 0,
      1971.0709731561756, -871.0268733905056, 0
    ],
    [
      1956.903546310055, -898.5986873443005, 0,
      1961.004643554492, -900.5681017364199, 0,
      1967.3427029305574, -900.0757481578847, 0,
      1959.886162485559, -892.6904434567764, 0,
      1956.903546310055, -898.5986873443005, 0
    ],
    [
      1945.3459086175003, -886.7821984962644, 0,
      1946.8372167083714, -892.6904434567764, 0,
      1951.6839679966845, -895.1522118828267, 0,
      1955.0394111972457, -888.75161359955, 0,
      1945.3459086175003, -886.7821984962644, 0
    ],
    [
      1940.4991573323061, -927.1551844439468, 0,
      1946.0915626644953, -930.1093034167184, 0,
      1950.9383139528086, -929.1245971236526, 0,
      1943.4817735078102, -921.2469457123781, 0,
      1940.4991573323061, -927.1551844439468, 0
    ],
    [
      1928.1958655958754, -916.8157659540948, 0,
      1930.4328277306226, -922.2316522456183, 0,
      1934.9067519969979, -924.693418435238, 0,
      1938.262195197559, -918.7851792576307, 0,
      1928.1958655958754, -916.8157659540948, 0
    ],
    [
      1924.4675953733763, -957.1887148369143, 0,
      1930.0600007086846, -960.1428310866676, 0,
      1934.5339249750598, -959.1581256950363, 0,
      1927.4502115551186, -951.280481529548, 0,
      1924.4675953733763, -957.1887148369143, 0
    ],
    [
      1912.1643036400646, -946.849305844875, 0,
      1914.401265777931, -952.2651871488771, 0,
      1918.8751900443062, -954.7269510895894, 0,
      1921.8578062198103, -948.8187173424228, 0,
      1912.1643036400646, -946.849305844875, 0
    ],
    [
      1985.8950485304697, -296.1225868907881, 0,
      2031.0071182161596, -213.4059309032711, 0,
      2149.193284264081, -278.39760679725214, 0,
      2104.081214575272, -361.6064578512056, 0,
      1985.8950485304697, -296.1225868907881, 0
    ],
    [
      2028.3973290625936, -278.8899674718542, 0,
      2036.22669652953, -279.38232815893286, 0,
      2041.4462748397812, -263.1344217953824, 0,
      2034.36256141984, -268.058030637472, 0,
      2028.3973290625936, -278.8899674718542, 0
    ],
    [
      2089.1681336852753, -308.92395543481206, 0,
      2095.5061930644597, -312.37047688191865, 0,
      2101.098598396649, -296.1225868907881, 0,
      2095.5061930644597, -296.61494731585816, 0,
      2089.1681336852753, -308.92395543481206, 0
    ],
    [
      2061.2061070212103, -293.16842421248276, 0,
      2067.1713393753375, -296.61494731585816, 0,
      2072.3909176855886, -280.85941014842837, 0,
      2067.5441663972756, -281.351770813673, 0,
      2061.2061070212103, -293.16842421248276, 0
    ],
    [
      1774.8749539513644, 22.928524679957626, 0,
      1819.2413695994164, 104.16888823473086, 0,
      1908.3470279081014, 55.42464588478405, 0,
      1852.050147551795, -29.754512293293818, 0,
      1774.8749539513644, 22.928524679957626, 0
    ],
    [
      1852.79580159879, 31.29873462289474, 0,
      1859.1338609779743, 27.852177339870465, 0,
      1862.8621311942352, 42.62313973944495, 0,
      1858.388206930979, 41.14604320223248, 0,
      1852.79580159879, 31.29873462289474, 0
    ],
    [
      1823.7152938657916, 47.0544297628102, 0,
      1829.680526223038, 43.60787080168307, 0,
      1833.4087964392988, 58.37884031915852, 0,
      1828.9348721729239, 56.90174307701808, 0,
      1823.7152938657916, 47.0544297628102, 0
    ],
    [
      1854.287109686542, -1032.193138983415, 0,
      1888.2143687078535, -970.6494130824212, 0,
      2000.0624753765906, -1035.1472349119042, 0,
      1967.2536974179739, -1094.7214458874457, 0,
      1854.287109686542, -1032.193138983415, 0
    ],
    [
      1952.7134435530343, -1033.1778376470393, 0,
      1964.2710812424698, -1044.0095210972474, 0,
      1970.6091406216542, -1043.0248227455384, 0,
      1957.9330218664047, -1032.193138983415, 0,
      1952.7134435530343, -1033.1778376470393, 0
    ],
    [
      1893.4339470212237, -1000.6827657929923, 0,
      1905.3644117325973, -1011.5144599917925, 0,
      1911.7024711117817, -1010.5297606606703, 0,
      1899.0263523565322, -999.6980661374785, 0,
      1893.4339470212237, -1000.6827657929923, 0
    ],
    [
      1903.8731036417262, -979.5117167474826, 0,
      1935.1905735094715, -922.3990509884775, 0,
      2032.4984263070307, -976.0652656185002, 0,
      2000.0624753765906, -1035.1472349119042, 0,
      1903.8731036417262, -979.5117167474826, 0
    ],
    [
      1977.6928540415954, -975.0805652206287, 0,
      2000.0624753765906, -987.3893179934631, 0,
      2003.4179185740325, -980.9887671306283, 0,
      1981.0482972452758, -968.6800119435716, 0,
      1977.6928540415954, -975.0805652206287, 0
    ],
    [
      1975.4558919099675, -1000.6827657929923, 0,
      1975.8287189287862, -1007.0833127912, 0,
      1985.8950485304697, -1012.4991592917232, 0,
      1988.504837684036, -1007.5756625238228, 0,
      1975.4558919099675, -1000.6827657929923, 0
    ],
    [
      2165.478377245554, -911.5673272731581, 0,
      2276.9536568892336, -712.1644996818052, 0,
      2360.094082840672, -758.9381115796275, 0,
      2523.3923185742833, -474.3565750395792, 0,
      2473.433497597161, -466.9712080771118, 0,
      2454.7921464846654, -500.94388227290165, 0,
      2420.864887463354, -481.74194033642027, 0,
      2379.108260971987, -341.912074357436, 0,
      2401.85070932892, -301.046190779667, 0,
      2539.4238805332134, -261.1649780427014, 0,
      2575.5881016861526, -281.351770813673, 0,
      2556.2010965329, -316.3093580865971, 0,
      2589.0098744852785, -353.2363463081028, 0,
      2749.6983210653234, -71.11309868214124, 0,
      2659.1013546657673, -8.582834739000306, 0,
      2760.8831317297017, 173.5926315347853, 0,
      2989.42609635237, 56.90174307701808, 0,
      3014.405506840931, 114.5085853333253, 0,
      3038.6392632887355, 100.7223232567628, 0,
      3018.5066040853685, 65.27196171614621, 0,
      3264.5724387515993, -75.0520089510621, 0,
      3283.586616882914, -40.58652807648909, 0,
      3447.2576796384633, -139.0592342131312, 0,
      3313.0399516409693, -380.31611117169496, 0,
      3270.910498127664, -356.6828630827222, 0,
      2885.7801841756263, -1048.4406632822463, 0,
      2932.3835619521874, -1074.5351551405945, 0,
      2800.0299690643837, -1316.277476644388, 0,
      2628.15671181996, -1227.1628980368596, 0,
      2646.425235910518, -1173.9894426527014, 0,
      2632.6306360863355, -1198.1144470091667, 0,
      2394.0213418619837, -1052.8718048839642, 0,
      2374.261509686793, -1088.3209160258498, 0,
      2349.2820991951126, -1074.5351551405945, 0,
      2381.718050131791, -1033.1778376470393, 0,
      2165.478377245554, -911.5673272731581, 0
    ],
    [
      2768.3396721747004, -409.3652885559163, 0,
      2811.214779728762, -433.4908569389715, 0,
      2837.6854983081944, -385.73206144946755, 0,
      2795.1832177760707, -361.1140983961913, 0,
      2768.3396721747004, -409.3652885559163, 0
    ],
    [
      2720.244986307268, -811.6198891179697, 0,
      2807.486509506263, -860.3627665682976, 0,
      2826.500687643816, -825.8981132666802, 0,
      2739.259164441702, -777.1551844439468, 0,
      2720.244986307268, -811.6198891179697, 0
    ],
    [
      2645.3067548415847, -616.1552972387381, 0,
      2694.51992177795, -643.727199604848, 0,
      2705.7047324423283, -624.0329860080757, 0,
      2656.4915655122013, -596.4610670293712, 0,
      2645.3067548415847, -616.1552972387381, 0
    ],
    [
      3176.212434483671, -373.42308225127516, 0,
      3206.0385962605455, -389.6709338363081, 0,
      3224.679947373041, -355.20578450245796, 0,
      3194.853785596167, -338.95791580264734, 0,
      3176.212434483671, -373.42308225127516, 0
    ],
    [
      3083.378505952487, -223.2531628294904, 0,
      3135.9471160862945, -251.81011863137869, 0,
      3142.28517546236, -239.5010890183601, 0,
      3090.0893923504905, -210.94412246476077, 0,
      3083.378505952487, -223.2531628294904, 0
    ],
    [
      1989.3336718249543, -819.8220143732303, 0,
      2010.2119850690783, -792.2501339940108, 0,
      2050.850130488393, -816.3755305929826, 0,
      2006.856541865398, -775.5100524361303, 0,
      2056.8153628456394, -671.6228840841029, 0,
      2170.154777602128, -733.167454944196, 0,
      2092.6067569797597, -878.904536897845, 0,
      1989.3336718249543, -819.8220143732303, 0
    ],
    [
      2066.881692447323, -770.5864974087408, 0,
      2101.1817784905725, -777.9718296737803, 0,
      2122.0600917346965, -740.0604396724946, 0,
      2088.8784867541417, -737.5986595683455, 0,
      2066.881692447323, -770.5864974087408, 0
    ],
    [
      2054.578400714011, -800.6201715664644, 0,
      2063.1534222248238, -824.2532072662555, 0,
      2088.1328327133847, -779.4488959302818, 0,
      2066.1360384003274, -779.4488959302818, 0,
      2054.578400714011, -800.6201715664644, 0
    ],
    [
      1742.060350577207, 35.303120213899355, 0,
      1808.050733513259, 136.2129105011551, 0,
      1878.142213690629, 97.32568617129444, 0,
      1829.3018737793209, -12.93657201237211, 0,
      1742.060350577207, 35.303120213899355, 0
    ],
    [
      1807.3050794662638, 84.03512642421215, 0,
      1834.521452089572, 69.26784415410978, 0,
      1840.8595114656373, 81.0816694349455, 0,
      1813.643138842329, 95.84895703879486, 0,
      1807.3050794662638, 84.03512642421215, 0
    ],
    [
      1801.3398471090175, 34.81087809819991, 0,
      1812.5246577796343, 28.903973277491833, 0,
      1825.9464305787596, 53.516083731832424, 0,
      1815.1344469332003, 59.422992997329665, 0,
      1801.3398471090175, 34.81087809819991, 0
    ],
    [
      1766.3742691542516, -1401.2586967901234, 0,
      1795.4547768888094, -1356.2028538183904, 0,
      1836.465749333181, -1394.6111212094906, 0,
      1848.7690410664927, -1372.2063095273256, 0,
      1934.519256179295, -1425.1407052855038, 0,
      1905.2523349337682, -1478.321134954032, 0,
      1766.3742691542516, -1401.2586967901234, 0
    ],
    [
      1885.3060892444894, -1439.4206524621932, 0,
      1901.151237689331, -1448.284061682003, 0,
      1910.0990862205217, -1431.788268456597, 0,
      1894.4403512897684, -1423.1710564252976, 0,
      1885.3060892444894, -1439.4206524621932, 0
    ],
    [
      1853.8022058673346, -1415.0462523455608, 0,
      1866.291911111615, -1421.9400257572488, 0,
      1873.5620380456444, -1408.6448887148172, 0,
      1861.0723328013637, -1401.7511096917779, 0,
      1853.8022058673346, -1415.0462523455608, 0
    ],
    [
      2704.475568354913, -404.5790628475182, 0,
      2733.183249065973, -344.51192294901483, 0,
      2754.247975821066, -352.63577034636745, 0,
      2734.8609706662537, -324.32537558031163, 0,
      2786.8703402687133, -353.1281246017582, 0,
      2746.045781333751, -427.47344744343707, 0,
      2704.475568354913, -404.5790628475182, 0
    ],
    [
      2758.535486579591, -360.5134366952528, 0,
      2761.5181027550952, -362.2366757032817, 0,
      2765.2463729775945, -360.26725967828725, 0,
      2761.145275733157, -355.8360727568753, 0,
      2758.535486579591, -360.5134366952528, 0
    ],
    [
      2751.451773156531, -374.29934367215026, 0,
      2753.5023217787493, -375.28405086820993, 0,
      2756.671351466782, -375.03787407894237, 0,
      2752.943081244283, -371.3452217283882, 0,
      2751.451773156531, -374.29934367215026, 0
    ],
    [
      2745.6729543102538, -368.3910992481322, 0,
      2746.4186083556892, -371.3452217283882, 0,
      2748.841983999846, -372.57610594141335, 0,
      2750.519705600126, -369.375806799775, 0,
      2745.6729543102538, -368.3910992481322, 0
    ],
    [
      2743.2495786676564, -388.5775922219734, 0,
      2746.045781333751, -390.0546517083592, 0,
      2748.469156977908, -389.5622985618263, 0,
      2744.7408867554086, -385.62347285618904, 0,
      2743.2495786676564, -388.5775922219734, 0
    ],
    [
      2737.0979327994414, -383.4078829770474, 0,
      2738.216413866815, -386.11582612280915, 0,
      2740.453376000002, -387.346709217619, 0,
      2742.131097600283, -384.39258962881536, 0,
      2737.0979327994414, -383.4078829770474, 0
    ],
    [
      2735.2337976881918, -403.59435741845715, 0,
      2738.030000355846, -405.0714155433338, 0,
      2740.266962489033, -404.5790628475182, 0,
      2736.7251057790627, -400.640240764774, 0,
      2735.2337976881918, -403.59435741845715, 0
    ],
    [
      2729.0821518215357, -398.4246529224375, 0,
      2730.200632890469, -401.13259357443854, 0,
      2732.4375950236567, -402.3634755447947, 0,
      2733.9289031114085, -399.4093586712114, 0,
      2729.0821518215357, -398.4246529224375, 0
    ],
    [
      2713.050589865725, -871.3227629485502, 0,
      2741.5718570658164, -819.3809529732949, 0,
      2800.2921130662794, -852.1215443648556, 0,
      2771.770845866188, -903.8170815137653, 0,
      2713.050589865725, -871.3227629485502, 0
    ],
    [
      2774.194221510345, -861.4759870046738, 0,
      2776.990424177999, -862.9530037742962, 0,
      2779.227386311187, -859.2604615983687, 0,
      2776.431183645092, -857.5372749624327, 0,
      2774.194221510345, -861.4759870046738, 0
    ],
    [
      2763.195824355376, -881.4157021445819, 0,
      2765.99202702303, -882.8927171128951, 0,
      2768.2289891562177, -878.954010228169, 0,
      2765.4327864885636, -877.4769949105109, 0,
      2763.195824355376, -881.4157021445819, 0
    ],
    [
      2748.282743466939, -873.0459481294025, 0,
      2751.0789461330332, -874.5229638556692, 0,
      2753.3159082677807, -870.5842549606508, 0,
      2750.519705600126, -869.1072388803606, 0,
      2748.282743466939, -873.0459481294025, 0
    ],
    [
      2744.5544732444396, -844.9826240075136, 0,
      2747.3506759120937, -846.4596422649707, 0,
      2749.5876380452814, -842.5209266138727, 0,
      2746.7914353776273, -841.0439079992728, 0,
      2744.5544732444396, -844.9826240075136, 0
    ],
    [
      2733.7424896004395, -864.9223592581432, 0,
      2736.5386922680937, -866.3993757205293, 0,
      2738.7756544012814, -862.460664865125, 0,
      2735.9794517336272, -860.9836480518344, 0,
      2733.7424896004395, -864.9223592581432, 0
    ],
    [
      1590.79906133289, -711.036725749287, 0,
      1655.48454968904, -593.8281249290951, 0,
      1704.8841301332552, -622.1454059025145, 0,
      1716.2553543117217, -601.9539584048473, 0,
      1925.9705543124844, -719.1625009593117, 0,
      1789.7022776896529, -820.1187652275295, 0,
      1770.128859022312, -783.6760880847884, 0,
      1758.9440483548144, -803.3748425701879, 0,
      1590.79906133289, -711.036725749287, 0
    ],
    [
      1783.550631822997, -795.2491092253985, 0,
      1798.8365397318128, -803.8673111315198, 0,
      1805.1745991125567, -792.7867649854892, 0,
      1789.5158641786838, -783.9223226578747, 0,
      1783.550631822997, -795.2491092253985, 0
    ],
    [
      1666.1101198220708, -677.3024036610569, 0,
      1681.5824412449747, -685.674431698995, 0,
      1687.9205006225993, -674.5938054407083, 0,
      1672.2617656902862, -665.7292990223531, 0,
      1666.1101198220708, -677.3024036610569, 0
    ],
    [
      1700.139218489439, -1572.1250823218265, 0,
      1736.117026132969, -1514.2670681535656, 0,
      1793.9052145770274, -1550.212922320069, 0,
      1748.4203178678401, -1624.8126277570186, 0,
      1700.139218489439, -1572.1250823218265, 0
    ],
    [
      1756.9953393786525, -1566.9548000219302, 0,
      1766.1296014239315, -1571.8788784396197, 0,
      1769.671458133902, -1565.4775762093495, 0,
      1760.5371960886232, -1560.5534958655849, 0,
      1756.9953393786525, -1566.9548000219302, 0
    ],
    [
      1746.1833557346527, -1547.9970842766515, 0,
      1752.8942421326558, -1551.6901475097543, 0,
      1757.5545799131191, -1542.5805900284254, 0,
      1751.0301070214061, -1538.8875247366832, 0,
      1746.1833557346527, -1547.9970842766515, 0
    ],
    [
      1724.7458019545024, -1557.845251046524, 0,
      1733.8800639997814, -1563.0155362253963, 0,
      1737.6083342238403, -1556.6142305266312, 0,
      1728.474072178561, -1551.1977391277487, 0,
      1724.7458019545024, -1557.845251046524, 0
    ],
    [
      1823.91778986799, -1380.8235484254265, 0,
      1876.2999864892688, -1332.8131596033704, 0,
      1934.0881749348869, -1369.0056196450514, 0,
      1897.7375402662997, -1426.6179417774301, 0,
      1823.91778986799, -1380.8235484254265, 0
    ],
    [
      1896.9918862208642, -1385.7476828973658, 0,
      1906.312561777112, -1390.9180224929337, 0,
      1910.2272455105804, -1384.0242360010889, 0,
      1900.7201564449228, -1378.8538942189966, 0,
      1896.9918862208642, -1385.7476828973658, 0
    ],
    [
      1885.6206620455168, -1366.7897570461232, 0,
      1892.3315484450795, -1370.482861202478, 0,
      1897.5511267553306, -1361.3732027620517, 0,
      1890.8402403573275, -1357.6800965454981, 0,
      1885.6206620455168, -1366.7897570461232, 0
    ],
    [
      1877.2320540456733, -1399.0428385611244, 0,
      1883.7565269342672, -1402.7359354405016, 0,
      1888.789691735109, -1393.380088398586, 0,
      1882.0788053324268, -1389.9331960377222, 0,
      1877.2320540456733, -1399.0428385611244, 0
    ],
    [
      1729.4061397349658, -1461.086755395469, 0,
      1760.3507825776542, -1400.2738709447058, 0,
      1829.8830222205575, -1414.8000460927997, 0,
      1789.244876801243, -1492.108625525092, 0,
      1729.4061397349658, -1461.086755395469, 0
    ],
    [
      1756.8089258676835, -1435.48135793735, 0,
      1765.7567743988743, -1440.6516818077216, 0,
      1769.485044622933, -1434.4965341536904, 0,
      1760.5371960886232, -1429.3262083322902, 0,
      1756.8089258676835, -1435.48135793735, 0
    ],
    [
      1780.6698552904306, -1458.6246996925574, 0,
      1789.8041173325905, -1464.0412217573662, 0,
      1793.5323875566492, -1457.886082905577, 0,
      1784.3981255113702, -1452.4695588055229, 0,
      1780.6698552904306, -1458.6246996925574, 0
    ],
    [
      1757.7409934225284, -1461.8253720358498, 0,
      1764.4518798220913, -1465.2722492501193, 0,
      1769.485044622933, -1455.670232357486, 0,
      1762.9605717343393, -1452.223353120447, 0,
      1757.7409934225284, -1461.8253720358498, 0
    ],
    [
      2324.4380672002953, -1195.6750160828906, 0,
      2338.605494043297, -1206.015813864121, 0,
      2373.0919935990746, -1164.6525835112056, 0,
      2400.8676067568495, -1177.455499326887, 0,
      2422.3051605338806, -1144.4633497431219, 0,
      2399.3762986659785, -1129.4445133310314, 0,
      2428.643219911505, -1101.3764869793472, 0,
      2428.083979378598, -1226.2049716325482, 0,
      2531.357064533404, -1290.4654175783317, 0,
      2456.7916600896588, -1412.091777129956, 0,
      2355.3827100445433, -1346.6007728708864, 0,
      2324.4380672002953, -1195.6750160828906, 0
    ],
    [
      2360.415874843825, -1196.9060637846187, 0,
      2375.7017827573195, -1220.2959524225143, 0,
      2399.0034716456003, -1203.7999291738106, 0,
      2383.531150222696, -1181.6410657891183, 0,
      2360.415874843825, -1196.9060637846187, 0
    ],
    [
      2422.49157404329, -1258.950747675724, 0,
      2462.3840654218475, -1285.0488380104284, 0,
      2477.4835598228133, -1262.1514591082077, 0,
      2437.591068445815, -1236.0533322217411, 0,
      2422.49157404329, -1258.950747675724, 0
    ],
    [
      2350.908785778168, -1241.4699280217028, 0,
      2355.3827100445433, -1260.4279991847998, 0,
      2411.1203498663826, -1247.3789395711033, 0,
      2406.8328391109767, -1228.6670623338855, 0,
      2350.908785778168, -1241.4699280217028, 0
    ],
    [
      1920.597890843841, -448.55059194289186, 0,
      1981.3686954665227, -380.1478709126728, 0,
      2063.2042268442974, -393.92685930230743, 0,
      2091.3526670224505, -376.7031220038176, 0,
      2093.403215644669, -342.50164706112, 0,
      1952.4746012444934, -307.0698278568256, 0,
      2030.3954488887998, -148.60991983424873, 0,
      2063.0178133333284, -157.96008123130795, 0,
      2115.2135964451977, -104.07355142788744, 0,
      2132.3636394668224, -51.66319467641198, 0,
      2080.5406833784505, -37.14574222431198, 0,
      2102.351064178979, 0.009152366744540645, 0,
      2146.9038933333213, 0.009152366744540645, 0,
      2150.2593365323232, -24.842806339261507, 0,
      2200.9638115564403, 0.009152366744540645, 0,
      2271.055291732251, -52.64742827940619, 0,
      2436.2176625786715, -72.5781459043456, 0,
      2425.2192654221426, -101.61297505686161, 0,
      2318.0314965323096, -79.22171305402092, 0,
      2285.59554559875, -215.04516124696403, 0,
      2381.2256767991475, -249.246902585371, 0,
      2367.4310769765248, -277.0511432171904, 0,
      2259.870481067873, -225.87161947320934, 0,
      2167.7822065774453, -264.74838770168424, 0,
      2109.2483640879514, -364.89254881457856, 0,
      2113.163047822979, -453.7176923429902, 0,
      2090.234185955077, -527.2871830201702, 0,
      1920.597890843841, -448.55059194289186, 0
    ],
    [
      2060.9672647111097, -219.9662795114879, 0,
      2095.826591287266, -321.09493213275874, 0,
      2115.2135964451977, -260.5654487227637, 0,
      2154.36043377676, -255.64434266815357, 0,
      2251.8547000884078, -172.72348308817882, 0,
      2269.37757013353, -117.36065745370027, 0,
      2252.7867676448122, -66.42669244403517, 0,
      2208.606765510848, -26.073100348228014, 0,
      2150.2593365323232, -31.978510283407527, 0,
      2138.701698844447, -100.87480207662064, 0,
      2063.9498808881735, -182.56574359101575, 0,
      2060.9672647111097, -219.9662795114879, 0
    ],
    [
      2236.382378665504, -210.616153547976, 0,
      2280.5623808010273, -213.32276951088423, 0,
      2282.6129294216867, -116.3764277449652, 0,
      2271.2417052463393, -157.96008123130795, 0,
      2236.382378665504, -210.616153547976, 0
    ],
    [
      1943.5267527101835, -435.2637548377406, 0,
      1948.559917511025, -460.60715701505, 0,
      2093.2168021337, -487.1807792759044, 0,
      2103.842372266731, -435.0177021937738, 0,
      2094.1488696901047, -394.4189658113883, 0,
      2070.8471808018244, -403.76898675466947, 0,
      2006.7209329785815, -388.7597400173136, 0,
      1943.5267527101835, -435.2637548377406, 0
    ],
    [
      2273.1058403544694, -76.26901687697648, 0,
      2279.0710727117157, -96.1997057371119, 0,
      2296.0347022223714, -125.72660755904732, 0,
      2311.320610134306, -76.26901687697648, 0,
      2273.1058403544694, -76.26901687697648, 0
    ],
    [
      1998.332324978738, -285.9091214660864, 0,
      2066.186843021361, -321.5870408377215, 0,
      2051.460175643893, -189.20926607913762, 0,
      2020.7019463121735, -198.31334808239714, 0,
      1998.332324978738, -285.9091214660864, 0
    ]
  ]
};

},{}],17:[function(require,module,exports){
/**
 * Copyright 2014, OpenStreetMap contributors.
 * Copyright 2014, Mapzen.
 *
 * This data is made available under the Open Database License:
 * http://opendatacommons.org/licenses/odbl/1.0/. Any rights in individual
 * contents of the database are licensed under the Database Contents License:
 * http://opendatacommons.org/licenses/dbcl/1.0/.
 */
/* jshint node: true */

module.exports = {
  // two buildings from the from the Mapzen nyc_midtown_14 benchmark data that,
  // together, happen to hit some nice corner cases
  name: 'Mapzen two buildings - OSM',
  value: [
    [
      1862.9511367068185, -959.1581256950363, 0,
      1920.3664981289392, -839.0238458980297, 0,
      1962.495951639125, -855.2715406927349, 0,
      1907.6903793736897, -827.69969021369, 0,
      1923.7219413295004, -798.6507511606233, 0,
      2027.74068053442, -856.2562492035164, 0,
      1946.0915626644953, -1004.9468948868741, 0,
      1862.9511367068185, -959.1581256950363, 0
    ],
    [
      1854.287109686542, -1032.193138983415, 0,
      1888.2143687078535, -970.6494130824212, 0,
      2000.0624753765906, -1035.1472349119042, 0,
      1967.2536974179739, -1094.7214458874457, 0,
      1854.287109686542, -1032.193138983415, 0
    ],
    [
      1766.3742691542516, -1131.2586967901234, 0,
      1795.4547768888094, -1086.2028538183904, 0,
      1836.465749333181, -1124.6111212094906, 0,
      1848.7690410664927, -1102.2063095273256, 0,
      1934.519256179295, -1155.1407052855038, 0,
      1905.2523349337682, -1208.321134954032, 0,
      1766.3742691542516, -1131.2586967901234, 0
    ],
    [
      1885.3060892444894, -1169.4206524621932, 0,
      1901.151237689331, -1178.284061682003, 0,
      1910.0990862205217, -1161.788268456597, 0,
      1894.4403512897684, -1153.1710564252976, 0,
      1885.3060892444894, -1169.4206524621932, 0
    ],
    [
      1823.91778986799, -1110.8235484254265, 0,
      1876.2999864892688, -1062.8131596033704, 0,
      1934.0881749348869, -1099.0056196450514, 0,
      1897.7375402662997, -1156.6179417774301, 0,
      1823.91778986799, -1110.8235484254265, 0
    ],
    [
      1877.2320540456733, -1129.0428385611244, 0,
      1883.7565269342672, -1132.7359354405016, 0,
      1888.789691735109, -1123.380088398586, 0,
      1882.0788053324268, -1119.9331960377222, 0,
      1877.2320540456733, -1129.0428385611244, 0
    ]
  ]
};

},{}],18:[function(require,module,exports){
/**
 * Poly2Tri Copyright (c) 2009-2010, Poly2Tri Contributors
 * http://code.google.com/p/poly2tri/
 *
 * All rights reserved.
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 * - Neither the name of Poly2Tri nor the names of its contributors may be
 *   used to endorse or promote products derived from this software without specific
 *   prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* jshint node: true */

module.exports = {
  // NOTE(bckenny): I believe the source of this is the poly2tri library.
  name: 'poly2tri dude.dat test',
  value: [
    // torso
    [
      280.35714, -648.79075, 0,
      286.78571, -662.8979, 0,
      263.28607, -661.17871, 0,
      262.31092, -671.41548, 0,
      250.53571, -677.00504, 0,
      250.53571, -683.43361, 0,
      256.42857, -685.21933, 0,
      297.14286, -669.50504, 0,
      289.28571, -649.50504, 0,
      285, -631.6479, 0,
      285, -608.79075, 0,
      292.85714, -585.21932, 0,
      306.42857, -563.79075, 0,
      323.57143, -548.79075, 0,
      339.28571, -545.21932, 0,
      357.85714, -547.36218, 0,
      375, -550.21932, 0,
      391.42857, -568.07647, 0,
      404.28571, -588.79075, 0,
      413.57143, -612.36218, 0,
      417.14286, -628.07647, 0,
      438.57143, -619.1479, 0,
      438.03572, -618.96932, 0,
      437.5, -609.50504, 0,
      426.96429, -609.86218, 0,
      424.64286, -615.57647, 0,
      419.82143, -615.04075, 0,
      420.35714, -605.04075, 0,
      428.39286, -598.43361, 0,
      437.85714, -599.68361, 0,
      443.57143, -613.79075, 0,
      450.71429, -610.21933, 0,
      431.42857, -575.21932, 0,
      405.71429, -550.21932, 0,
      372.85714, -534.50504, 0,
      349.28571, -531.6479, 0,
      346.42857, -521.6479, 0,
      346.42857, -511.6479, 0,
      350.71429, -496.6479, 0,
      367.85714, -476.6479, 0,
      377.14286, -460.93361, 0,
      385.71429, -445.21932, 0,
      388.57143, -404.50504, 0,
      360, -352.36218, 0,
      337.14286, -325.93361, 0,
      330.71429, -334.50504, 0,
      347.14286, -354.50504, 0,
      337.85714, -370.21932, 0,
      333.57143, -359.50504, 0,
      319.28571, -353.07647, 0,
      312.85714, -366.6479, 0,
      350.71429, -387.36218, 0,
      368.57143, -408.07647, 0,
      375.71429, -431.6479, 0,
      372.14286, -454.50504, 0,
      366.42857, -462.36218, 0,
      352.85714, -462.36218, 0,
      336.42857, -456.6479, 0,
      332.85714, -438.79075, 0,
      338.57143, -423.79075, 0,
      338.57143, -411.6479, 0,
      327.85714, -405.93361, 0,
      320.71429, -407.36218, 0,
      315.71429, -423.07647, 0,
      314.28571, -440.21932, 0,
      325, -447.71932, 0,
      324.82143, -460.93361, 0,
      317.85714, -470.57647, 0,
      304.28571, -483.79075, 0,
      287.14286, -491.29075, 0,
      263.03571, -498.61218, 0,
      251.60714, -503.07647, 0,
      251.25, -533.61218, 0,
      260.71429, -533.61218, 0,
      272.85714, -528.43361, 0,
      286.07143, -518.61218, 0,
      297.32143, -508.25504, 0,
      297.85714, -507.36218, 0,
      298.39286, -506.46932, 0,
      307.14286, -496.6479, 0,
      312.67857, -491.6479, 0,
      317.32143, -503.07647, 0,
      322.5, -514.1479, 0,
      325.53571, -521.11218, 0,
      327.14286, -525.75504, 0,
      326.96429, -535.04075, 0,
      311.78571, -540.04075, 0,
      291.07143, -552.71932, 0,
      274.82143, -568.43361, 0,
      259.10714, -592.8979, 0,
      254.28571, -604.50504, 0,
      251.07143, -621.11218, 0,
      250.53571, -649.1479, 0,
      268.1955, -654.36208, 0
    ],
    // head hole
    [
      325, -437, 0,
      320, -423, 0,
      329, -413, 0,
      332, -423, 0
    ],
    // chest hole
    [
      320.72342, -480, 0,
      338.90617, -465.96863, 0,
      347.99754, -480.61584, 0,
      329.8148, -510.41534, 0,
      339.91632, -480.11077, 0,
      334.86556, -478.09046, 0
    ]
  ]
};

},{}],19:[function(require,module,exports){
/**
 * Copyright (C) 2008 The Android Open Source Project
 * https://developer.android.com/design/style/typography.html
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* jshint node: true */

module.exports = {
  // the glyph '®' extracted (and discretized) from Roboto-Regular.ttf
  name: 'Roboto-Regular - ®',
  value: [
    [
      -0.9999999999999999, 0.002000997040499937, 0,
      -0.9992788988857305, 0.04648873301990429, 0,
      -0.9970217998724913, 0.09161864943961594, 0,
      -0.9932279525949193, 0.13594307220386775, 0,
      -0.987706013885336, 0.18080898870149464, 0,
      -0.9805497794141721, 0.22481828157529724, 0,
      -0.9714673570550477, 0.2692652350159509, 0,
      -0.9606500899756413, 0.3128028616346211, 0,
      -0.9477025356294176, 0.3566711691940256, 0,
      -0.9329165861427566, 0.39957587350349105, 0,
      -0.9162922415156582, 0.44151697456301725, 0,
      -0.8978295017481224, 0.4824944723726036, 0,
      -0.8775283668401491, 0.5225083669322508, 0,
      -0.8553888367917383, 0.5615586582419584, 0,
      -0.8314109116028903, 0.5996453463017265, 0,
      -0.8055945912736049, 0.6367684311115553, 0,
      -0.7779398758038818, 0.6729279126714447, 0,
      -0.749314937919226, 0.707131566911518, 0,
      -0.718955155314288, 0.740425894329607, 0,
      -0.6874386949906718, 0.7722471927183174, 0,
      -0.6539049096285311, 0.8033758093109373, 0,
      -0.6194923850313031, 0.8326144741818627, 0,
      -0.5842011211989884, 0.8599631873310931, 0,
      -0.546953991798623, 0.8861421249985997, 0,
      -0.5087756724648826, 0.9103183024073896, 0,
      -0.4696661631977669, 0.9324917195574641, 0,
      -0.42962546399727614, 0.9526623764488217, 0,
      -0.3886535748634103, 0.9708302730814627, 0,
      -0.34675049579616934, 0.986995409455388, 0,
      -0.3039162267955531, 1.0011577855705964, 0,
      -0.26015076786156177, 1.0133174014270885, 0,
      -0.21674408874050172, 1.0232118545583144, 0,
      -0.17245867038435456, 1.031216355967845, 0,
      -0.12729451279312035, 1.0373309056556814, 0,
      -0.08261836137291827, 1.0414582266949708, 0,
      -0.03711440110582199, 1.0438051347369195, 0,
      0.007759658398456171, 1.0443804855245455, 0,
      0.052296082954650686, 1.0432745041082387, 0,
      0.09742419003381685, 1.0403688341819142, 0,
      0.14173990743404521, 1.0356708818711278, 0,
      0.1865488358810105, 1.0289559947006925, 0,
      0.23049539291488816, 1.0203385561653007, 0,
      0.2748337055351396, 1.009480353197912, 0,
      0.3182581730160893, 0.9966060382737125, 0,
      0.36076879535773754, 0.9817156113927041, 0,
      0.40236557256008443, 0.9648090725548865, 0,
      0.4430485046231296, 0.9458864217602587, 0,
      0.48281759154687337, 0.9249476590088215, 0,
      0.5216728333313154, 0.9019927843005752, 0,
      0.5596142299764557, 0.8770217976355181, 0,
      0.5955965333718161, 0.8508337376708206, 0,
      0.6307164653540889, 0.8227431263411659, 0,
      0.6649740259232734, 0.7927499636465548, 0,
      0.6973993125681321, 0.7618195146177366, 0,
      0.7283873460234066, 0.729753706949517, 0,
      0.7582578324121242, 0.6961651855596092, 0,
      0.7863892836343755, 0.6616673373477184, 0,
      0.8135316209968064, 0.6252050090521335, 0,
      0.8388311226508285, 0.5877790775066093, 0,
      0.8622877885964403, 0.5493895427111456, 0,
      0.8839016188336429, 0.5100364046657427, 0,
      0.9036726133624363, 0.4697196633704006, 0,
      0.9216007721828205, 0.42843931882511865, 0,
      0.9376860952947945, 0.38619537102989776, 0,
      0.9519285826983591, 0.34298781998473676, 0,
      0.9639995326773617, 0.3000920711227614, 0,
      0.9743314474898974, 0.2562869954388021, 0,
      0.982924327135967, 0.21157259293285913, 0,
      0.9896014098231306, 0.16730371714274614, 0,
      0.9946402491744105, 0.12217821772880916, 0,
      0.9979618665165884, 0.07760207819722621, 0,
      0.9997430236421042, 0.03222044501018342, 0,
      0.9999999999999999, -0.012430854122944758, 0,
      0.998756425081553, -0.058087572016184336, 0,
      0.9959822964173258, -0.10294397626404027, 0,
      0.9915184304390311, -0.1483639240189828, 0,
      0.985426856424453, -0.19293275696941065, 0,
      0.9774482471520151, -0.23796196799607497, 0,
      0.9677417861900048, -0.282087699946505, 0,
      0.9563074735384217, -0.3253099528207007, 0,
      0.9427320297922773, -0.3688597192010987, 0,
      0.9273256013404876, -0.41145207912095433, 0,
      0.9100881881830523, -0.4530870325802675, 0,
      0.8910197903199712, -0.4937645795790382, 0,
      0.8701204077512446, -0.5334847201172664, 0,
      0.8473900404768726, -0.5722474541949523, 0,
      0.8228286884968543, -0.6100527818120958, 0,
      0.796436351811191, -0.6469007029686967, 0,
      0.7682130304198814, -0.6827912176647554, 0,
      0.7390428283665099, -0.7167395235505459, 0,
      0.708033602882243, -0.7498988352437908, 0,
      0.6759333624948463, -0.7815232766802632, 0,
      0.64201351861376, -0.8122289538914648, 0,
      0.6072341659613071, -0.8410295343413875, 0,
      0.5715953045374855, -0.8679250180300313, 0,
      0.534010441271245, -0.8936215762049811, 0,
      0.49551476637444664, -0.9172993250957034, 0,
      0.45610827984708946, -0.9389582647021987, 0,
      0.41579098168917417, -0.9585983950244666, 0,
      0.3745628719007007, -0.9762197160625073, 0,
      0.3324239504816688, -0.9918222278163208, 0,
      0.2893742174320784, -1.0054059302859069, 0,
      0.24541367275192985, -1.0169708234712658, 0,
      0.2018369950278301, -1.0262721782469217, 0,
      0.15740080853236296, -1.033668436261299, 0,
      0.11210511326552813, -1.039159597514397, 0,
      0.06731968330347299, -1.0426673816462155, 0,
      0.021724560389843856, -1.0443804855245453, 0,
      -0.0231618889017594, -1.0443290904400853, 0,
      -0.06891670033458136, -1.042517478616857, 0,
      -0.11384370292050915, -1.0389212939528363, 0,
      -0.15926631322794538, -1.0333496248447613, 0,
      -0.2038101843002947, -1.0258835882399409, 0,
      -0.24747531613755683, -1.016523184138375, 0,
      -0.29150682933822664, -1.004908712137351, 0,
      -0.33460715260552126, -0.991286800531212, 0,
      -0.37677628593944107, -0.9756574493199577, 0,
      -0.4180142293399854, -0.9580206585035882, 0,
      -0.4583209828071548, -0.9383764280821034, 0,
      -0.497696546340949, -0.9167247580555034, 0,
      -0.5361409199413681, -0.8930656484237882, 0,
      -0.5736541036084121, -0.8673990991869577, 0,
      -0.6092038201569291, -0.8405436540860366, 0,
      -0.6438747974703588, -0.81179384148837, 0,
      -0.6776670355487018, -0.7811496613939577, 0,
      -0.7096250328666187, -0.7495951688908586, 0,
      -0.740477569433398, -0.7165125534798841, 0,
      -0.7695267851317522, -0.6825960861085718, 0,
      -0.797629910728443, -0.6467252994060715, 0,
      -0.823906463630827, -0.6098838702090119, 0,
      -0.8483564438389043, -0.5720717985173933, 0,
      -0.870979851352675, -0.5332890843312156, 0,
      -0.8917766861721387, -0.4935357276504786, 0,
      -0.9107469482972957, -0.4528117284751826, 0,
      -0.9278906377281463, -0.4111170868053275, 0,
      -0.9432077544646897, -0.36845180264091315, 0,
      -0.9566982985069267, -0.3248158759819396, 0,
      -0.9680543618863879, -0.28149725037353457, 0,
      -0.977686737074324, -0.2372626551947537, 0,
      -0.985387418445546, -0.1934531221924677, 0,
      -0.9914643139685232, -0.1487807078215491, 0,
      -0.9959174236432555, -0.103245412081998, 0,
      -0.998684867660099, -0.058265918120249616, 0,
      -0.9999254460124771, -0.012475046269171857, 0,
      -0.9999999999999999, 0.002000997040499937, 0
    ],
    [
      -0.8222155791938117, 0.00269546743427411, 0,
      -0.821356704508117, -0.04191492377137783, 0,
      -0.8186683641807817, -0.087005187615814, 0,
      -0.8139789620206986, -0.13248397436200407, 0,
      -0.8073430155677513, -0.1769265125287575, 0,
      -0.7984700625192851, -0.2216319677088481, 0,
      -0.7875308053362443, -0.26523741980553317, 0,
      -0.7745252440186294, -0.30774286881881247, 0,
      -0.7589788078504113, -0.35034946968610486, 0,
      -0.7412427327852608, -0.39179040984650093, 0,
      -0.7213170188231782, -0.4320656893000008, 0,
      -0.6992016659641636, -0.47117530804660435, 0,
      -0.6748966742082168, -0.5091192660863116, 0,
      -0.6484020435553377, -0.5458975634191229, 0,
      -0.6197177740055265, -0.5815102000450378, 0,
      -0.5897563640541986, -0.6149891531680169, 0,
      -0.5580739452807223, -0.646944419071551, 0,
      -0.5242392871921646, -0.6777262628057756, 0,
      -0.4893450914563303, -0.7061875240855353, 0,
      -0.4533913580732194, -0.7323282029108303, 0,
      -0.41527342171077236, -0.7568137604266907, 0,
      -0.3760327054020333, -0.7788402232135551, 0,
      -0.3356692091470018, -0.7984075912714236, 0,
      -0.294182932945678, -0.8155158646002959, 0,
      -0.251573876798062, -0.8301650432001724, 0,
      -0.20784204070415366, -0.8423551270710525, 0,
      -0.1642845665582338, -0.8518422141643059, 0,
      -0.11966755476503715, -0.8590087188030943, 0,
      -0.07534955640774411, -0.8637452363647808, 0,
      -0.030033429592073547, -0.8662956688979968, 0,
      0.014743531892980834, -0.8666806892269406, 0,
      0.060333208655815845, -0.8649181109695109, 0,
      0.10492687639542624, -0.860960623938678, 0,
      0.1498301279348105, -0.8545875279409731, 0,
      0.19367609165890748, -0.8458844828688387, 0,
      0.23770725238098012, -0.8344917171740167, 0,
      0.280618017278029, -0.8206299310499766, 0,
      0.3224083863500543, -0.8042991244967181, 0,
      0.36307835959705603, -0.7854992975142415, 0,
      0.40262793701903493, -0.7642304501025461, 0,
      0.44105711861598995, -0.7404925822616327, 0,
      0.47836590438792154, -0.714285693991501, 0,
      0.5135358886865716, -0.6864633609262519, 0,
      0.5476485851699341, -0.6563110787865731, 0,
      0.5797468669818134, -0.6248174635075926, 0,
      0.610573954830264, -0.5914711381348489, 0,
      0.6391606290463836, -0.5572157122471127, 0,
      0.6664233813442407, -0.5208037654221832, 0,
      0.6914900546307636, -0.48322615789035755, 0,
      0.7143606489059514, -0.4444828896516355, 0,
      0.7350351641698039, -0.40457396070601737, 0,
      0.7535136004223216, -0.363499371053503, 0,
      0.7697959576635045, -0.32125912069409246, 0,
      0.7838822358933528, -0.27785320962778565, 0,
      0.7954631913327186, -0.23457128784974937, 0,
      0.8049717652724088, -0.19018936298830724, 0,
      0.8122188260098139, -0.14606083954259536, 0,
      0.8175136173240813, -0.10089606751744683, 0,
      0.8207835341540198, -0.05611030279644463, 0,
      0.8222177082022387, -0.01035014088045346, 0,
      0.821853079637369, 0.03439274887950707, 0,
      0.8196560710039398, 0.07966930232048429, 0,
      0.8156089498370966, 0.12396383122026522, 0,
      0.8094976162001114, 0.16861402770242892, 0,
      0.8011432017914139, 0.2135249499412152, 0,
      0.7907001837805417, 0.25732725853779165, 0,
      0.7781685621674953, 0.3000209534921582, 0,
      0.7630867121941814, 0.34281234278517525, 0,
      0.7457915928327502, 0.38442894686045265, 0,
      0.7262832040832016, 0.4248707657179904, 0,
      0.7045615459455357, 0.4641377993577883, 0,
      0.6806266184197525, 0.5022300477798466, 0,
      0.6544784215058518, 0.5391475109841651, 0,
      0.6261169552038339, 0.5748901889707441, 0,
      0.5964464981494151, 0.6084867308022708, 0,
      0.5652390034490256, 0.6405542162383495, 0,
      0.5326199394990264, 0.6709355422528543, 0,
      0.49796646630072366, 0.6999454575252567, 0,
      0.46225142910215317, 0.7266291060069477, 0,
      0.42437709277289415, 0.7516676653005705, 0,
      0.3853778291942154, 0.7742411062389842, 0,
      0.3452536383661177, 0.7943494288221893, 0,
      0.3040045202886007, 0.8119926330501854, 0,
      0.2616304749616643, 0.827170718922972, 0,
      0.2181315023853088, 0.8398836864405498, 0,
      0.17479818236128253, 0.8498729497183112, 0,
      0.13040329833698783, 0.8575359462053611, 0,
      0.08494685031242499, 0.8628726759016992, 0,
      0.03981216719317198, 0.8658277994156782, 0,
      -0.004894843466358854, 0.8666006678637913, 0,
      -0.049380354912371104, 0.865323113819481, 0,
      -0.09427303329115433, 0.8618647350979702, 0,
      -0.13948213965194636, 0.8560279100580283, 0,
      -0.18363170836546194, 0.8478835030255519, 0,
      -0.22797305357307218, 0.8370891694402283, 0,
      -0.2711916188343896, 0.8238495175669687, 0,
      -0.3132874041494152, 0.808164547405771, 0,
      -0.35426040951814797, 0.7900342589566366, 0,
      -0.3941106349405888, 0.7694586522195648, 0,
      -0.4328380804167371, 0.7464377271945561, 0,
      -0.47044274594659324, 0.7209714838816097, 0,
      -0.5058978733780445, 0.6938913304986246, 0,
      -0.5402934631622192, 0.6645035951231049, 0,
      -0.572664166335904, 0.6337734299119623, 0,
      -0.6042169127499014, 0.6006430615758817, 0,
      -0.6333628554696518, 0.5667170468033537, 0,
      -0.6611822563064945, 0.5306306687607265, 0,
      -0.686786232730847, 0.4933649030161549, 0,
      -0.7101747847427092, 0.4549197495696408, 0,
      -0.731347912342081, 0.41529520842118295, 0,
      -0.7503056155289625, 0.3744912795707823, 0,
      -0.7670478943033535, 0.33250796301843744, 0,
      -0.7815747486652546, 0.28934525876414957, 0,
      -0.7935651681385695, 0.24628645073395988, 0,
      -0.8034649503703832, 0.2021146858193245, 0,
      -0.811074255036141, 0.15817775323283959, 0,
      -0.8167140926119377, 0.113192369048464, 0,
      -0.8203021759053098, 0.06856890223440767, 0,
      -0.8220383452408125, 0.022959563578073883, 0,
      -0.8222155791938117, 0.00269546743427411, 0
    ],
    [
      -0.24441621157369986, -0.0889746245439167, 0,
      -0.24441621157369986, -0.1361986113205603, 0,
      -0.24441621157369986, -0.1834225980972042, 0,
      -0.24441621157369986, -0.23064658487384798, 0,
      -0.24441621157369986, -0.2778705716504917, 0,
      -0.24441621157369986, -0.32509455842713547, 0,
      -0.24441621157369986, -0.3723185452037792, 0,
      -0.24441621157369986, -0.419542531980423, 0,
      -0.24441621157369986, -0.46676651875706676, 0,
      -0.24441621157369986, -0.5139905055337105, 0,
      -0.24441621157369986, -0.5612144923103543, 0,
      -0.2977515378155563, -0.5612144923103543, 0,
      -0.35108686405741274, -0.5612144923103543, 0,
      -0.40442219029926935, -0.5612144923103543, 0,
      -0.4222006323798881, -0.44287673721123516, 0,
      -0.4222006323798881, -0.32453898211211607, 0,
      -0.4222006323798881, -0.2062012270129972, 0,
      -0.4222006323798881, -0.0878634719138781, 0,
      -0.4222006323798881, 0.030474283185241025, 0,
      -0.4222006323798881, 0.14881203828436015, 0,
      -0.4222006323798881, 0.2671497933834791, 0,
      -0.4222006323798881, 0.38548754848259825, 0,
      -0.4222006323798881, 0.5038253035817175, 0,
      -0.4222006323798881, 0.6221630586808363, 0,
      -0.34428105419842586, 0.6221630586808363, 0,
      -0.26636147601696364, 0.6221630586808363, 0,
      -0.18844189783550158, 0.6221630586808363, 0,
      -0.11052231965403934, 0.6221630586808363, 0,
      -0.03260274147257712, 0.6221630586808363, 0,
      0.012731554172566186, 0.6211398671747362, 0,
      0.057310212125981266, 0.6179228173500715, 0,
      0.10229116191463387, 0.6120564323756829, 0,
      0.1471399838648343, 0.6030552183226554, 0,
      0.1900752588303134, 0.5908082424384152, 0,
      0.23191587589988932, 0.5745520263670062, 0,
      0.2720412186783102, 0.5537227707071085, 0,
      0.30955828929842644, 0.5279392922890676, 0,
      0.34247502699893373, 0.49764104658001296, 0,
      0.37039781785133813, 0.46207859529623924, 0,
      0.39233137240496546, 0.4220329729818021, 0,
      0.40756695707296353, 0.3800257586678272, 0,
      0.4172354831652179, 0.3353774359270957, 0,
      0.42171537941791853, 0.2898973195838891, 0,
      0.4214962751157351, 0.24454624063894645, 0,
      0.41429747119169136, 0.1999728245613056, 0,
      0.39899265476827966, 0.15750639399636518, 0,
      0.3756822420618521, 0.11854926591165084, 0,
      0.34580615491429, 0.08451661648806255, 0,
      0.31181265793087226, 0.055591438743883, 0,
      0.27434623739801256, 0.030701619831016543, 0,
      0.23440190077372078, 0.009422818333547392, 0,
      0.27197067485889836, -0.016553905922854256, 0,
      0.3102802021552126, -0.03918914964010744, 0,
      0.3450739816933214, -0.06806543112692111, 0,
      0.37378188062929363, -0.10327109181158511, 0,
      0.395586804635824, -0.14334937351527852, 0,
      0.4102983429039372, -0.1855895139366017, 0,
      0.4190150802669696, -0.23057209150980984, 0,
      0.42221247512654064, -0.2764041337342263, 0,
      0.4222753664495061, -0.32335838244270004, 0,
      0.4222857919761533, -0.3688752543904369, 0,
      0.42302861074975273, -0.4135773062711681, 0,
      0.4252883436504929, -0.45913529388961916, 0,
      0.43041419356344196, -0.5039084469156575, 0,
      0.43894265590008624, -0.5478806607498901, 0,
      0.3947743388560489, -0.5612144923103543, 0,
      0.3285218632899928, -0.5612144923103543, 0,
      0.26226938772393676, -0.5612144923103543, 0,
      0.21754122174429324, -0.5602536613236555, 0,
      0.20325846149733615, -0.5177593977171104, 0,
      0.20004484044177062, -0.473048930170217, 0,
      0.2000448404417708, -0.42854185637442915, 0,
      0.2000448404417708, -0.3829508964588046, 0,
      0.2000448404417708, -0.338497837026977, 0,
      0.2000448404417708, -0.2930794732741462, 0,
      0.19831347893346174, -0.24822928885413564, 0,
      0.1901443327619323, -0.2032063951826554, 0,
      0.1729419961122693, -0.16207720314932358, 0,
      0.1434694786656363, -0.12790719987683413, 0,
      0.10381693438653836, -0.10598595665577183, 0,
      0.06003237264284309, -0.09438782950258709, 0,
      0.015367171860062081, -0.08960374185574554, 0,
      -0.03378334114199325, -0.08897462454391655, 0,
      -0.08059064568237256, -0.0889746245439167, 0,
      -0.12739795022275172, -0.0889746245439167, 0,
      -0.17420525476313087, -0.0889746245439167, 0,
      -0.2210125593035102, -0.0889746245439167, 0,
      -0.24441621157369986, -0.0889746245439167, 0
    ],
    [
      -0.24441621157369986, 0.08880979626227155, 0,
      -0.1785804182439083, 0.08880979626227155, 0,
      -0.11274462491411673, 0.08880979626227155, 0,
      -0.046908831584325024, 0.08880979626227155, 0,
      -0.0019289742154090103, 0.08945002244799916, 0,
      0.04258433779843872, 0.09483076785782611, 0,
      0.0866141943560587, 0.10702067443408131, 0,
      0.12670341922038977, 0.12644086873448787, 0,
      0.16217240957295886, 0.15468027776005988, 0,
      0.18703041413845728, 0.1918615558554294, 0,
      0.1987639126702797, 0.2353082415287445, 0,
      0.19933407439132492, 0.2806100884203692, 0,
      0.1927014667062943, 0.3257448343018951, 0,
      0.17625230953882717, 0.36797326129179453, 0,
      0.1469513417449259, 0.40205551246301835, 0,
      0.10691553102347585, 0.4233082967147869, 0,
      0.06376554612055868, 0.4349279310283476, 0,
      0.018492533001217063, 0.44125027479022805, 0,
      -0.02705809994832284, 0.44397961197102304, 0,
      -0.07378483582338555, 0.44437863787464804, 0,
      -0.13066196107349037, 0.44437863787464804, 0,
      -0.18753908632359503, 0.44437863787464804, 0,
      -0.24441621157369986, 0.44437863787464804, 0,
      -0.24441621157369986, 0.37326486955217286, 0,
      -0.24441621157369986, 0.30215110122969746, 0,
      -0.24441621157369986, 0.23103733290722228, 0,
      -0.24441621157369986, 0.15992356458474674, 0,
      -0.24441621157369986, 0.08880979626227155, 0
    ],
  ]
};

},{}],"chai":[function(require,module,exports){
/* jshint node: true */

// stub to let the browserified tests use the page-provided Chai
module.exports = window.chai;

},{}]},{},[2,4,6]);

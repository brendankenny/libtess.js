/* jshint node: true */
'use strict';

var chai = require('chai');
var assert = chai.assert;

// TODO(bckenny): not sure of a better way of doing this yet. Want to inject
// libtess.cat.js for coverage, but libtess.min.js for all other runs.
// gulp-mocha takes file names, though. Write to temp files first?
exports.libtess = (function() {
  if (process.env.testType === 'coverage') {
    return require('../libtess.cat.js');

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

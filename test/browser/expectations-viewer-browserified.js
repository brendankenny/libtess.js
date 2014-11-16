require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"../libtess.min.js":[function(require,module,exports){
/* jshint node: true */

// stub to let the browserified tests use the page-provided libtess
module.exports = window.libtess;

},{}],1:[function(require,module,exports){
/* jshint node: true */
'use strict';

var common = require('./common.js');
var libtess = common.libtess;
var createTessellator = common.createInstrumentedTessellator;
var tessellate = common.tessellate;

var basetess = require('./expectations/libtess.baseline.js');

// geometry tests are both in test/geometry/ and in third_party/test/geometry/
var rfolder = require('./rfolder.js');
var geometryFiles = {"degenerate-hourglass": require("./geometry/degenerate-hourglass.js"),"hourglass": require("./geometry/hourglass.js"),"letter-e": require("./geometry/letter-e.js"),"shared-borders": require("./geometry/shared-borders.js"),"shared-edge-triangles": require("./geometry/shared-edge-triangles.js"),"two-opposite-triangles": require("./geometry/two-opposite-triangles.js"),"two-triangles": require("./geometry/two-triangles.js")};
var geometries = Object.keys(geometryFiles).map(function(filename) {
  return geometryFiles[filename];
});
var thirdPartyFiles = {"osm_nyc_midtown_16": require("./../third_party/test/geometry/osm_nyc_midtown_16.js"),"poly2tri-dude": require("./../third_party/test/geometry/poly2tri-dude.js"),"roboto-registered": require("./../third_party/test/geometry/roboto-registered.js")};
var thirdPartyGeometries = Object.keys(thirdPartyFiles).map(function(filename) {
  return thirdPartyFiles[filename];
});
geometries.push.apply(geometries, thirdPartyGeometries);

var TRIANGULATION = common.OUTPUT_TYPES[0];
var BOUNDARIES = common.OUTPUT_TYPES[1];
var VIEW_BOUNDS_EXCESS = 0.02;
var PROVIDE_NORMAL = common.PROVIDE_NORMAL[0];
// TODO(bckenny): maybe add this back when switch to more general transforms
// optionsToOptions(common.NORMALS, document.querySelector('#test-geometry'));
var NORMAL = {
  name: 'xyPlane',
  value: [0, 0, 1],
};
var DEFAULT_SELECTED = 3;

var updateScheduled = false;
var geometrySelect;
var windingSelect;
var inputSvg;
var resultSvg;
var expectationSvg;
var boundaryResultSvg;
var boundaryExpectationSvg;

function init() {
  geometrySelect = document.querySelector('#test-geometry');
  windingSelect = document.querySelector('#winding-rule');

  inputSvg = document.querySelector('#input-contours');
  resultSvg = document.querySelector('#triangulation-result');
  expectationSvg = document.querySelector('#triangulation-expectation');
  boundaryResultSvg = document.querySelector('#boundaries-result');
  boundaryExpectationSvg = document.querySelector('#boundaries-expectation');

  optionsToOptions(geometries, geometrySelect);
  optionsToOptions(common.WINDING_RULES, windingSelect);

  // pick a more interesting default geometry
  geometrySelect.children[DEFAULT_SELECTED].selected = true;

  scheduleUpdate();
}

/**
 * Schedule a redraw on next rAF. Coalesces multiple calls per frame.
 */
function scheduleUpdate() {
  if (updateScheduled) {
    return;
  }

  updateScheduled = true;
  window.requestAnimationFrame(update);
}

/**
 * Update rendering.
 */
function update() {
  updateScheduled = false;

  var geometry = geometries[parseInt(geometrySelect.value)];
  var contours = geometry.value;

  var bounds = getContourBounds(contours);

  // NOTE(bckenny): could base this on actual offsetWidth *and* offsetHeight of
  // element but...squares are easy. Also assumes all svg canvases are the same
  // size.
  var contoursSize = Math.max(bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY) * (1 + VIEW_BOUNDS_EXCESS);
  var scale = inputSvg.getBoundingClientRect().width / contoursSize;
  var dX = -scale * (bounds.minX + bounds.maxX - contoursSize) / 2;
  var dY = scale * (bounds.minY + bounds.maxY + contoursSize) / 2;

  drawContourInput(inputSvg, contours, scale, dX, dY);

  var windingRule = common.WINDING_RULES[parseInt(windingSelect.value)];

  // triangulation result
  var tessellator = createTessellator(libtess, TRIANGULATION);
  var results = tessellate(tessellator, geometry.value, TRIANGULATION,
      PROVIDE_NORMAL, NORMAL, windingRule);
  drawTriangleResults(resultSvg, results, scale, dX, dY);

  // expectation
  var baselineTessellator = createTessellator(basetess, TRIANGULATION);
  var expectation = tessellate(baselineTessellator, geometry.value,
      TRIANGULATION, PROVIDE_NORMAL, NORMAL, windingRule);
  drawTriangleResults(expectationSvg, expectation, scale, dX, dY);

  // boundary result
  tessellator = createTessellator(libtess, BOUNDARIES);
  var boundaryResults = tessellate(tessellator, geometry.value, BOUNDARIES,
      PROVIDE_NORMAL, NORMAL, windingRule);
  drawBoundaryResults(boundaryResultSvg, boundaryResults, scale, dX, dY);

  // boundary expectation
  baselineTessellator = createTessellator(basetess, BOUNDARIES);
  var boundaryExpectation = tessellate(baselineTessellator, geometry.value,
      BOUNDARIES, PROVIDE_NORMAL, NORMAL, windingRule);
  drawBoundaryResults(boundaryExpectationSvg, boundaryExpectation, scale, dX,
      dY);
}

/**
 * Draw the input contours on the supplied svgCanvas with the specified
 * transformation.
 * @param {!SVGElement} svgCanvas
 * @param {!Array<!Array<number>>} contours
 * @param {number} scale
 * @param {number} dX
 * @param {number} dY
 */
function drawContourInput(svgCanvas, contours, scale, dX, dY) {
  // clear current content
  while (svgCanvas.firstChild) {
    svgCanvas.removeChild(svgCanvas.firstChild);
  }
  // draw input contours
  for (var i = 0; i < contours.length; i++) {
    var contour = contours[i];
    if (contour.length < 6) {
      continue;
    }

    var pathString = 'M' + (contour[0] * scale + dX) + ',' +
        (contour[1] * -scale + dY);
    for (var j = 3; j < contour.length; j += 3) {
      pathString += 'L' + (contour[j] * scale + dX) + ',' +
          (contour[j + 1] * -scale + dY);
    }
    pathString += 'Z';

    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathString);
    svgCanvas.appendChild(path);
  }
}

/**
 * Draw triangulation results to the supplied svgCanvas with the specified
 * transformation.
 * @param {!SVGElement} svgCanvas
 * @param {!Array<!Array<number>>} results
 * @param {number} scale
 * @param {number} dX
 * @param {number} dY
 */
function drawTriangleResults(svgCanvas, results, scale, dX, dY) {
  // clear current content
  while (svgCanvas.firstChild) {
    svgCanvas.removeChild(svgCanvas.firstChild);
  }
  // draw triangles
  for (var i = 0; i < results.length; i++) {
    var result = results[i];
    if (result.length < 9) {
      throw new Error('result with invalid geometry emitted');
    }

    var pathString = '';
    for (var j = 0; j < result.length; j += 9) {
      pathString += 'M' + (result[j] * scale + dX) + ',' +
          (result[j + 1] * -scale + dY) +
          'L' + (result[j + 3] * scale + dX) + ',' +
          (result[j + 4] * -scale + dY) +
          'L' + (result[j + 6] * scale + dX) + ',' +
          (result[j + 7] * -scale + dY) +
          'Z';
    }

    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathString);
    svgCanvas.appendChild(path);
  }
}

/**
 * Draw boundary results to the supplied svgCanvas with the specified
 * transformation.
 * @param {!SVGElement} svgCanvas
 * @param {!Array<!Array<number>>} results
 * @param {number} scale
 * @param {number} dX
 * @param {number} dY
 */
function drawBoundaryResults(svgCanvas, results, scale, dX, dY) {
  // clear current content
  while (svgCanvas.firstChild) {
    svgCanvas.removeChild(svgCanvas.firstChild);
  }
  var j;
  var result;
  var path;
  var pathString;
  var clockwise;
  var title;

  // draw boundaries
  for (var i = 0; i < results.length; i++) {
    result = results[i];
    if (result.length < 9) {
      throw new Error('result with invalid geometry emitted');
    }

    pathString = 'M' + (result[0] * scale + dX) + ',' +
        (result[1] * -scale + dY);
    for (j = 3; j < result.length; j += 3) {
      pathString += 'L' + (result[j] * scale + dX) + ',' +
          (result[j + 1] * -scale + dY);
    }
    pathString += 'Z';

    clockwise = isClockwise(result);

    path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathString);
    path.setAttribute('class', clockwise ? 'clockwise' : 'anticlockwise');
    title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = (clockwise ? 'clockwise' : 'anticlockwise') + ' path';

    path.appendChild(title);
    svgCanvas.appendChild(path);
  }

  // add a center black stroke
  for (i = 0; i < results.length; i++) {
    result = results[i];
    if (result.length < 9) {
      throw new Error('result with invalid geometry emitted');
    }

    pathString = 'M' + (result[0] * scale + dX) + ',' +
        (result[1] * -scale + dY);
    for (j = 3; j < result.length; j += 3) {
      pathString += 'L' + (result[j] * scale + dX) + ',' +
          (result[j + 1] * -scale + dY);
    }
    pathString += 'Z';

    path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathString);
    path.setAttribute('class', 'center-stroke');

    clockwise = isClockwise(result);
    title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = (clockwise ? 'clockwise' : 'anticlockwise') + ' path';

    path.appendChild(title);
    svgCanvas.appendChild(path);
  }
}

/**
 * Returns true if the non-intersecting contour (representing a simple polygon)
 * is wound clockwise.
 * @param {!Array<number>} contour
 * @return {boolean}
 */
function isClockwise(contour) {
  // Gauss's area formula/shoelace formula
  var area = 0;
  for (var i = 0; i < contour.length; i += 3) {
    var x1 = contour[i];
    var y1 = contour[i + 1];
    var x2 = contour[(i + 3) % contour.length];
    var y2 = contour[(i + 4) % contour.length];
    area += (x1 * y2 - x2 * y1);
  }
  return area > 0;
}

/**
 * Calculate the xy-bounds of a set of contours.
 * @param {!Array<!Array<number>>} contours
 * @return {{minX: number, maxX: number, minY: number, maxY: number}}
 */
function getContourBounds(contours) {
  var minX = Number.MAX_VALUE;
  var maxX = -Number.MAX_VALUE;
  var minY = Number.MAX_VALUE;
  var maxY = -Number.MAX_VALUE;

  for (var i = 0; i < contours.length; i++) {
    var contour = contours[i];
    for (var j = 0; j < contour.length; j += 3) {
      minX = Math.min(minX, contour[j]);
      maxX = Math.max(maxX, contour[j]);
      minY = Math.min(minY, contour[j + 1]);
      maxY = Math.max(maxY, contour[j + 1]);
    }
  }

  return {
    minX: minX,
    maxX: maxX,
    minY: minY,
    maxY: maxY
  };
}

/**
 * Add a set of options as the children of a HTMLSelectElement.
 * @param {!Array<{name: string, value: *}>} options
 * @param {!HTMLSelectElement} selectElement
 */
function optionsToOptions(options, selectElement) {
  options.forEach(function(value, index) {
    var opt = document.createElement('option');
    opt.value = index;
    opt.textContent = value.name;
    selectElement.appendChild(opt);
  });

  selectElement.addEventListener('change', scheduleUpdate);
}

document.addEventListener('DOMContentLoaded', init, false);

},{"./../third_party/test/geometry/osm_nyc_midtown_16.js":12,"./../third_party/test/geometry/poly2tri-dude.js":13,"./../third_party/test/geometry/roboto-registered.js":14,"./common.js":3,"./expectations/libtess.baseline.js":4,"./geometry/degenerate-hourglass.js":5,"./geometry/hourglass.js":6,"./geometry/letter-e.js":7,"./geometry/shared-borders.js":8,"./geometry/shared-edge-triangles.js":9,"./geometry/two-opposite-triangles.js":10,"./geometry/two-triangles.js":11,"./rfolder.js":2}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
/* jshint node: true */
'use strict';

var chai = require('chai');
var assert = chai.assert;

// TODO(bckenny): not sure of a better way of doing this yet. Want to inject
// libtess.cat.js for coverage, but libtess.min.js for all other runs.
// gulp-mocha takes file names, though. Write to temp files first?
exports.libtess = (function() {
  if ("browserify" === 'coverage') {
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

},{"../libtess.cat.js":undefined,"../libtess.min.js":undefined,"chai":undefined}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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
  name: 'NYC midtown multi-contour z14 - OSM',
  value: [
    [
      2218.6644821285, -1781.04419577972, 0,
      2270.4874382215507, -1687.019263839243, 0,
      2388.6736042632338, -1753.4767044598084, 0,
      2336.8506481733025, -1847.0091699428203, 0,
      2218.6644821285, -1781.04419577972, 0
    ],
    [
      2331.2582428411133, -1785.4746832769065, 0,
      2342.0702264866727, -1791.87427528175, 0,
      2348.035458843919, -1781.5364721904768, 0,
      2336.8506481733025, -1775.1368781613048, 0,
      2331.2582428411133, -1785.4746832769065, 0
    ],
    [
      2284.6548650645523, -1759.8763027279056, 0,
      2296.9581567947444, -1766.2758997452238, 0,
      2302.5505621300526, -1755.9380885597554, 0,
      2290.62009741556, -1749.5384895305854, 0,
      2284.6548650645523, -1759.8763027279056, 0
    ],
    [
      1196.372787197828, -2445.1183500196094, 0,
      1223.2163327991982, -2396.383937166506, 0,
      1322.3883207064475, -2451.5178129820865, 0,
      1295.1719480862582, -2500.2521437142013, 0,
      1196.372787197828, -2445.1183500196094, 0
    ],
    [
      1261.9903431057037, -2463.8244690090687, 0,
      1276.5305969737624, -2471.2084604013044, 0,
      1282.8686563529468, -2466.778065764341, 0,
      1266.8370944002552, -2454.963677140009, 0,
      1261.9903431057037, -2463.8244690090687, 0
    ],
    [
      1227.3174300436353, -2440.68795184553, 0,
      1250.4327054193873, -2456.440475944969, 0,
      1255.2794567077005, -2448.071948465461, 0,
      1234.7739704855146, -2436.25755308505, 0,
      1227.3174300436353, -2440.68795184553, 0
    ],
    [
      1312.9511367068185, -809.1581256950363, 0,
      1370.3664981289392, -689.0238458980297, 0,
      1412.495951639125, -705.2715406927349, 0,
      1357.6903793736897, -677.69969021369, 0,
      1373.7219413295004, -648.6507511606233, 0,
      1477.74068053442, -706.2562492035164, 0,
      1396.0915626644953, -854.9468948868741, 0,
      1312.9511367068185, -809.1581256950363, 0
    ],
    [
      1421.0709731561756, -721.0268733905056, 0,
      1427.0362055071837, -724.4733514065634, 0,
      1434.492745952182, -720.5345193565745, 0,
      1426.2905514633076, -711.6721455137506, 0,
      1421.0709731561756, -721.0268733905056, 0
    ],
    [
      1406.903546310055, -748.5986873443005, 0,
      1411.004643554492, -750.5681017364199, 0,
      1417.3427029305574, -750.0757481578847, 0,
      1409.886162485559, -742.6904434567764, 0,
      1406.903546310055, -748.5986873443005, 0
    ],
    [
      1395.3459086175003, -736.7821984962644, 0,
      1396.8372167083714, -742.6904434567764, 0,
      1401.6839679966845, -745.1522118828267, 0,
      1405.0394111972457, -738.75161359955, 0,
      1395.3459086175003, -736.7821984962644, 0
    ],
    [
      1390.4991573323061, -777.1551844439468, 0,
      1396.0915626644953, -780.1093034167184, 0,
      1400.9383139528086, -779.1245971236526, 0,
      1393.4817735078102, -771.2469457123781, 0,
      1390.4991573323061, -777.1551844439468, 0
    ],
    [
      1378.1958655958754, -766.8157659540948, 0,
      1380.4328277306226, -772.2316522456183, 0,
      1384.9067519969979, -774.693418435238, 0,
      1388.262195197559, -768.7851792576307, 0,
      1378.1958655958754, -766.8157659540948, 0
    ],
    [
      1374.4675953733763, -807.1887148369143, 0,
      1380.0600007086846, -810.1428310866676, 0,
      1384.5339249750598, -809.1581256950363, 0,
      1377.4502115551186, -801.280481529548, 0,
      1374.4675953733763, -807.1887148369143, 0
    ],
    [
      1362.1643036400646, -796.849305844875, 0,
      1364.401265777931, -802.2651871488771, 0,
      1368.8751900443062, -804.7269510895894, 0,
      1371.8578062198103, -798.8187173424228, 0,
      1362.1643036400646, -796.849305844875, 0
    ],
    [
      1330.1011797284434, -1742.6455258971005, 0,
      1387.1437141286258, -1638.7619059465899, 0,
      1504.584226129552, -1704.2430887297112, 0,
      1447.5416917293696, -1807.6341630275306, 0,
      1330.1011797284434, -1742.6455258971005, 0
    ],
    [
      1452.3884430176827, -1722.9519740093476, 0,
      1457.9808483529912, -1725.9060075485925, 0,
      1462.4547726193662, -1718.5209231967374, 0,
      1456.862367287177, -1715.0745499248653, 0,
      1452.3884430176827, -1722.9519740093476, 0
    ],
    [
      1430.391648707745, -1762.8314042891639, 0,
      1435.9840540430532, -1765.7854342257901, 0,
      1440.4579783094284, -1757.908020456338, 0,
      1434.86557297412, -1754.9539898210219, 0,
      1430.391648707745, -1762.8314042891639, 0
    ],
    [
      1400.5654869308705, -1746.091896258805, 0,
      1406.1578922630597, -1749.0459277113384, 0,
      1410.631816532554, -1741.1685099213016, 0,
      1405.0394111972457, -1738.2144777607211, 0,
      1400.5654869308705, -1746.091896258805, 0
    ],
    [
      1393.1089464858721, -1689.965248015027, 0,
      1398.7013518211804, -1692.9192845299415, 0,
      1403.1752760875556, -1685.0418532277454, 0,
      1397.5828707522473, -1682.0878159985457, 0,
      1393.1089464858721, -1689.965248015027, 0
    ],
    [
      1371.4849791978722, -1729.8447185162863, 0,
      1377.0773845331805, -1732.7987514410586, 0,
      1381.5513087995557, -1724.92132973025, 0,
      1375.9589034642474, -1721.9672961036688, 0,
      1371.4849791978722, -1729.8447185162863, 0
    ],
    [
      185.89504853046978, -296.1225868907881, 0,
      231.00711821615963, -213.4059309032711, 0,
      349.193284264081, -278.39760679725214, 0,
      304.08121457527204, -361.6064578512056, 0,
      185.89504853046978, -296.1225868907881, 0
    ],
    [
      228.3973290625936, -278.8899674718542, 0,
      236.22669652952996, -279.38232815893286, 0,
      241.44627483978115, -263.1344217953824, 0,
      234.36256141983995, -268.058030637472, 0,
      228.3973290625936, -278.8899674718542, 0
    ],
    [
      289.16813368527534, -308.92395543481206, 0,
      295.5061930644597, -312.37047688191865, 0,
      301.09859839664887, -296.1225868907881, 0,
      295.5061930644597, -296.61494731585816, 0,
      289.16813368527534, -308.92395543481206, 0
    ],
    [
      261.2061070212102, -293.16842421248276, 0,
      267.1713393753374, -296.61494731585816, 0,
      272.3909176855886, -280.85941014842837, 0,
      267.54416639727543, -281.351770813673, 0,
      261.2061070212102, -293.16842421248276, 0
    ],
    [
      -25.12504604863561, 22.928524679957626, 0,
      19.241369599416526, 104.16888823473086, 0,
      108.34702790810135, 55.42464588478405, 0,
      52.05014755179482, -29.754512293293818, 0,
      -25.12504604863561, 22.928524679957626, 0
    ],
    [
      52.79580159878998, 31.29873462289474, 0,
      59.13386097797433, 27.852177339870465, 0,
      62.862131194235204, 42.62313973944495, 0,
      58.38820693097917, 41.14604320223248, 0,
      52.79580159878998, 31.29873462289474, 0
    ],
    [
      23.71529386579171, 47.0544297628102, 0,
      29.680526223038054, 43.60787080168307, 0,
      33.40879643929893, 58.37884031915852, 0,
      28.93487217292375, 56.90174307701808, 0,
      23.71529386579171, 47.0544297628102, 0
    ],
    [
      54.28710968654199, -1032.193138983415, 0,
      88.21436870785345, -970.6494130824212, 0,
      200.0624753765905, -1035.1472349119042, 0,
      167.2536974179739, -1094.7214458874457, 0,
      54.28710968654199, -1032.193138983415, 0
    ],
    [
      152.71344355303432, -1033.1778376470393, 0,
      164.27108124246988, -1044.0095210972474, 0,
      170.60914062165423, -1043.0248227455384, 0,
      157.9330218664047, -1032.193138983415, 0,
      152.71344355303432, -1033.1778376470393, 0
    ],
    [
      93.43394702122379, -1000.6827657929923, 0,
      105.36441173259733, -1011.5144599917925, 0,
      111.70247111178168, -1010.5297606606703, 0,
      99.02635235653213, -999.6980661374785, 0,
      93.43394702122379, -1000.6827657929923, 0
    ],
    [
      103.87310364172616, -979.5117167474826, 0,
      135.1905735094716, -922.3990509884775, 0,
      232.4984263070308, -976.0652656185002, 0,
      200.0624753765905, -1035.1472349119042, 0,
      103.87310364172616, -979.5117167474826, 0
    ],
    [
      177.69285404159544, -975.0805652206287, 0,
      200.0624753765905, -987.3893179934631, 0,
      203.4179185740325, -980.9887671306283, 0,
      181.04829724527576, -968.6800119435716, 0,
      177.69285404159544, -975.0805652206287, 0
    ],
    [
      175.45589190996742, -1000.6827657929923, 0,
      175.82871892878626, -1007.0833127912, 0,
      185.89504853046978, -1012.4991592917232, 0,
      188.5048376840358, -1007.5756625238228, 0,
      175.45589190996742, -1000.6827657929923, 0
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
      1439.3336718249543, -669.8220143732303, 0,
      1460.2119850690783, -642.2501339940108, 0,
      1500.850130488393, -666.3755305929826, 0,
      1456.856541865398, -625.5100524361303, 0,
      1506.8153628456394, -521.6228840841029, 0,
      1620.1547776021282, -583.167454944196, 0,
      1542.60675697976, -728.904536897845, 0,
      1439.3336718249543, -669.8220143732303, 0
    ],
    [
      1516.8816924473228, -620.5864974087408, 0,
      1551.1817784905722, -627.9718296737803, 0,
      1572.0600917346962, -590.0604396724946, 0,
      1538.8784867541415, -587.5986595683455, 0,
      1516.8816924473228, -620.5864974087408, 0
    ],
    [
      1504.5784007140112, -650.6201715664644, 0,
      1513.1534222248235, -674.2532072662555, 0,
      1538.1328327133847, -629.4488959302818, 0,
      1516.1360384003276, -629.4488959302818, 0,
      1504.5784007140112, -650.6201715664644, 0
    ],
    [
      -57.93964942279306, 35.303120213899355, 0,
      8.05073351325899, 136.2129105011551, 0,
      78.14221369062908, 97.32568617129444, 0,
      29.301873779320903, -12.93657201237211, 0,
      -57.93964942279306, 35.303120213899355, 0
    ],
    [
      7.305079466263835, 84.03512642421215, 0,
      34.521452089572094, 69.26784415410978, 0,
      40.85951146563729, 81.0816694349455, 0,
      13.643138842329034, 95.84895703879486, 0,
      7.305079466263835, 84.03512642421215, 0
    ],
    [
      1.3398471090174897, 34.81087809819991, 0,
      12.524657779634175, 28.903973277491833, 0,
      25.946430578759728, 53.516083731832424, 0,
      15.134446933200195, 59.422992997329665, 0,
      1.3398471090174897, 34.81087809819991, 0
    ],
    [
      3157.3322410657534, -2938.5220978882444, 0,
      3183.2437191122785, -2891.5096319180057, 0,
      3242.3368021331203, -2924.7383522282885, 0,
      3216.4253240881544, -2971.5045849697945, 0,
      3157.3322410657534, -2938.5220978882444, 0
    ],
    [
      3213.62912142206, -2940.7373416368378, 0,
      3219.03511324484, -2943.937137639259, 0,
      3222.017729423463, -2938.768236093623, 0,
      3216.4253240881544, -2935.5684390790366, 0,
      3213.62912142206, -2940.7373416368378, 0
    ],
    [
      3190.3274325337798, -2927.938151362337, 0,
      3196.4790783988756, -2931.137949870996, 0,
      3199.2752810665297, -2925.969044278262, 0,
      3193.3100487092834, -2922.769244763677, 0,
      3190.3274325337798, -2927.938151362337, 0
    ],
    [
      2646.1863936004174, -3270.559175008189, 0,
      2659.6081664011026, -3246.1919685816374, 0,
      2709.194160354727, -3273.7589064894273, 0,
      2695.5859740446326, -3298.126071855485, 0,
      2646.1863936004174, -3270.559175008189, 0
    ],
    [
      2678.9951715543552, -3279.9122345029186, 0,
      2686.265298488385, -3283.6042301990365, 0,
      2689.434328177977, -3281.3890328805546, 0,
      2681.418547201631, -3275.481838568389, 0,
      2678.9951715543552, -3279.9122345029186, 0
    ],
    [
      2661.6587150233213, -3268.343975921149, 0,
      2673.216352711197, -3276.2202379708688, 0,
      2675.639728355354, -3272.035974231115, 0,
      2665.386985244261, -3266.1287765409093, 0,
      2661.6587150233213, -3268.343975921149, 0
    ],
    [
      866.3742691542516, -2501.2586967901234, 0,
      895.4547768888094, -2456.2028538183904, 0,
      936.4657493331812, -2494.6111212094906, 0,
      948.7690410664927, -2472.2063095273256, 0,
      1034.519256179295, -2525.140705285504, 0,
      1005.2523349337682, -2578.321134954032, 0,
      866.3742691542516, -2501.2586967901234, 0
    ],
    [
      985.3060892444894, -2539.420652462193, 0,
      1001.1512376893311, -2548.284061682003, 0,
      1010.0990862205218, -2531.788268456597, 0,
      994.4403512897683, -2523.1710564252976, 0,
      985.3060892444894, -2539.420652462193, 0
    ],
    [
      953.8022058673345, -2515.046252345561, 0,
      966.291911111615, -2521.940025757249, 0,
      973.5620380456444, -2508.644888714817, 0,
      961.0723328013638, -2501.751109691778, 0,
      953.8022058673345, -2515.046252345561, 0
    ],
    [
      1275.9247530666223, -3043.6425164052125, 0,
      1299.5992689768407, -2996.1261781993508, 0,
      1382.553281421989, -3039.949541704512, 0,
      1351.79505208871, -3092.3897043418933, 0,
      1350.303744000958, -3063.092169420716, 0,
      1326.069987556273, -3078.1102401001244, 0,
      1336.695557689304, -3052.9980485907404, 0,
      1309.1063580440577, -3068.754722282962, 0,
      1320.4775822209647, -3055.2138317480303, 0,
      1331.8488063994312, -3027.8858185193017, 0,
      1310.7840796443384, -3063.092169420716, 0,
      1305.0052608011802, -3028.8706125852564, 0,
      1275.9247530666223, -3043.6425164052125, 0
    ],
    [
      1354.5912547563642, -3051.028463317532, 0,
      1358.8787655117703, -3053.490444875122, 0,
      1359.9972465775845, -3045.612102581415, 0,
      1356.8282168895519, -3047.089292052151, 0,
      1354.5912547563642, -3051.028463317532, 0
    ],
    [
      1340.4238279102435, -3042.903921533382, 0,
      1344.5249251546807, -3045.3659043152384, 0,
      1346.2026467565208, -3035.7641693657188, 0,
      1343.0336170669286, -3037.7337564792256, 0,
      1340.4238279102435, -3042.903921533382, 0
    ],
    [
      2143.1204067556764, -519.4228439473953, 0,
      2172.3873279996437, -481.748646565693, 0,
      2252.7315512896666, -523.1163880318265, 0,
      2228.3113813324526, -567.1926164348242, 0,
      2189.9101980447663, -545.7701068577054, 0,
      2205.5689329786387, -517.4529534232222, 0,
      2183.572138667141, -542.0765678933594, 0,
      2143.1204067556764, -519.4228439473953, 0
    ],
    [
      2210.7885112888903, -546.2625786598345, 0,
      2216.940157157105, -549.9561166884354, 0,
      2228.3113813324526, -529.7647652917885, 0,
      2222.1597354673568, -526.3174589073918, 0,
      2210.7885112888903, -546.2625786598345, 0
    ],
    [
      2165.3036145765836, -520.9002616837879, 0,
      2172.9465685341106, -525.0862778744653, 0,
      2183.9449656890793, -505.14113228298163, 0,
      2179.4710414227043, -502.6787669389015, 0,
      2165.3036145765836, -520.9002616837879, 0
    ],
    [
      2011.8852949321272, -162.62255085430226, 0,
      2035.1869838219673, -140.95326910294858, 0,
      2070.046310401243, -156.71274959063297, 0,
      2031.6451271104372, -130.85734392718695, 0,
      2044.3212458656867, -105.24813990951716, 0,
      2101.736607289367, -137.25963866328198, 0,
      2067.995761779024, -198.08131359073474, 0,
      2011.8852949321272, -162.62255085430226, 0
    ],
    [
      2070.232723912212, -141.6919950867023, 0,
      2076.1979562647794, -144.89314064564266, 0,
      2078.9941589324335, -139.47581702783052, 0,
      2073.028926576747, -136.27467040837905, 0,
      2070.232723912212, -141.6919950867023, 0
    ],
    [
      2052.70985386709, -173.21093944635743, 0,
      2056.6245376005577, -175.42711293723363, 0,
      2060.912048355964, -168.03986680212384, 0,
      2056.8109511115267, -165.82369231623872, 0,
      2052.70985386709, -173.21093944635743, 0
    ],
    [
      2051.404959288747, -131.34982822307254, 0,
      2056.6245376005577, -134.05849160870906, 0,
      2059.607153779181, -128.64116440075495, 0,
      2054.573988978339, -125.68625788620284, 0,
      2051.404959288747, -131.34982822307254, 0
    ],
    [
      2040.03373511184, -166.3161755640898, 0,
      2043.7620053343392, -168.53234998447277, 0,
      2048.0495160897453, -160.898859040785, 0,
      2044.3212458656867, -158.6826835786058, 0,
      2040.03373511184, -166.3161755640898, 0
    ],
    [
      1031.723053511641, -1955.163664315988, 0,
      1067.328034133233, -1926.3565217748485, 0,
      1049.9915775990796, -1921.678434008014, 0,
      1063.5997639107338, -1896.564466273543, 0,
      1117.2868551119147, -1922.170864358195, 0,
      1083.1731825780746, -1982.739684832286, 0,
      1031.723053511641, -1955.163664315988, 0
    ],
    [
      1067.1416206222639, -1934.9740483708956, 0,
      1081.6818744903228, -1945.0688594563537, 0,
      1088.2063473789165, -1933.0043284065391, 0,
      1071.0563043572918, -1927.587597279123, 0,
      1067.1416206222639, -1934.9740483708956, 0
    ],
    [
      1069.1921692444826, -1956.6409523066454, 0,
      1076.462296178512, -1960.5803862980556, 0,
      1079.444912357135, -1955.163664315988, 0,
      1072.1747854231057, -1951.2242290114154, 0,
      1069.1921692444826, -1956.6409523066454, 0
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
      1889.6621112871371, -816.919251725944, 0,
      1907.184981333819, -785.4094430003516, 0,
      1940.7394133331925, -810.2726564989268, 0,
      1959.0079374237505, -777.5319813238701, 0,
      1993.6808504904975, -796.7332874933049, 0,
      1960.8720725334404, -856.306427257502, 0,
      1889.6621112871371, -816.919251725944, 0
    ],
    [
      1971.4976426649118, -789.1020018450183, 0,
      1975.2259128889705, -791.0713662262415, 0,
      1976.9036344908106, -788.11731956941, 0,
      1972.988950755783, -786.1479548310442, 0,
      1971.4976426649118, -789.1020018450183, 0
    ],
    [
      1960.3128320005335, -819.3809529732949, 0,
      1964.041102221473, -821.5964837850876, 0,
      1965.7188238233132, -818.3962725208299, 0,
      1961.9905535992543, -816.4269114303104, 0,
      1960.3128320005335, -819.3809529732949, 0
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
      1551.1351751116604, -1884.2781619021544, 0,
      1579.2836152898135, -1832.8318787605072, 0,
      1638.0038712902767, -1865.0781325771661, 0,
      1609.8554311121234, -1916.5243142778072, 0,
      1551.1351751116604, -1884.2781619021544, 0
    ],
    [
      1612.2788067547203, -1875.1704584967842, 0,
      1614.702182398877, -1876.401229520524, 0,
      1616.7527310210955, -1872.7089161592237, 0,
      1614.3293553784986, -1871.47814485632, 0,
      1612.2788067547203, -1875.1704584967842, 0
    ],
    [
      1602.0260636436276, -1893.8781681109713, 0,
      1604.4494392893437, -1895.1089377295339, 0,
      1605.9407473770957, -1889.2012427142079, 0,
      1604.076612265846, -1890.185858695396, 0,
      1602.0260636436276, -1893.8781681109713, 0
    ],
    [
      1587.1129827551904, -1885.7550862997005, 0,
      1589.3499448883779, -1886.9858565296165, 0,
      1591.027666490218, -1880.8320044505294, 0,
      1588.97711786644, -1882.0627750516244, 0,
      1587.1129827551904, -1885.7550862997005, 0
    ],
    [
      1583.0118855107532, -1858.6781177917749, 0,
      1585.4352611564693, -1859.9088900616152, 0,
      1587.2993962661594, -1856.216572980728, 0,
      1585.0624341329717, -1854.985800434843, 0,
      1583.0118855107532, -1858.6781177917749, 0
    ],
    [
      1572.3863153777222, -1877.6320004553681, 0,
      1574.8096910218787, -1878.8627712966377, 0,
      1576.3009991111903, -1872.955070411071, 0,
      1574.436863999941, -1873.9396873701126, 0,
      1572.3863153777222, -1877.6320004553681, 0
    ],
    [
      2140.9475242667386, -148.06129344539406, 0,
      2163.5035591095834, -106.70296545163555, 0,
      2222.596642133544, -139.19880339862607, 0,
      2200.0406072891396, -180.8032289256028, 0,
      2140.9475242667386, -148.06129344539406, 0
    ],
    [
      2162.1986645328, -139.4449837359271, 0,
      2166.1133482662685, -139.69116407946643, 0,
      2168.723137421394, -131.5672108976912, 0,
      2165.1812807114234, -134.029015318736, 0,
      2162.1986645328, -139.4449837359271, 0
    ],
    [
      2192.584066844141, -154.46197771740603, 0,
      2195.7530965337332, -156.18523844095932, 0,
      2198.549299199828, -148.06129344539406, 0,
      2195.7530965337332, -148.30747365792908, 0,
      2192.584066844141, -154.46197771740603, 0
    ],
    [
      2178.6030535121085, -146.58421210624138, 0,
      2181.5856696891724, -148.30747365792908, 0,
      2184.1954588442977, -140.42970507421418, 0,
      2181.772083200141, -140.6758854068365, 0,
      2178.6030535121085, -146.58421210624138, 0
    ],
    [
      2035.4374769771857, 11.464262339978813, 0,
      2057.6206848012116, 52.08444411736543, 0,
      2102.173513955554, 27.712322942392024, 0,
      2074.025073777401, -14.877256146646909, 0,
      2035.4374769771857, 11.464262339978813, 0
    ],
    [
      2074.3979008008987, 15.64936731144737, 0,
      2077.5669304904904, 13.926088669935233, 0,
      2079.431065598621, 21.311569869722476, 0,
      2077.194103466993, 20.57302160111624, 0,
      2074.3979008008987, 15.64936731144737, 0
    ],
    [
      2059.8576469343993, 23.5272148814051, 0,
      2062.8402631130225, 21.803935400841535, 0,
      2064.704398221153, 29.18942015957926, 0,
      2062.4674360879653, 28.45087153850904, 0,
      2059.8576469343993, 23.5272148814051, 0
    ],
    [
      1510.6834432001956, 1.863143208980106, 0,
      1534.3579591119735, 43.96039968952715, 0,
      1576.8602396440974, 16.14173267569189, 0,
      1554.6770318216309, -23.001267307187746, 0,
      1510.6834432001956, 1.863143208980106, 0
    ],
    [
      1547.4069048876015, 1.863143208980106, 0,
      1550.2031075552557, 0.13986601943242807, 0,
      1552.8128967103812, 8.017706103429457, 0,
      1550.7623480881628, 7.525340993395687, 0,
      1547.4069048876015, 1.863143208980106, 0
    ],
    [
      1532.307410489755, 9.74098413046899, 0,
      1535.6628536887565, 7.771523549972148, 0,
      1538.2726428454419, 16.14173267569189, 0,
      1535.2900266683782, 15.64936731144737, 0,
      1532.307410489755, 9.74098413046899, 0
    ],
    [
      2075.1435548447744, -516.0965694917076, 0,
      2092.10718435543, -485.3247065412106, 0,
      2148.0312376897987, -517.5736174559521, 0,
      2131.6268487104903, -547.3607229437229, 0,
      2075.1435548447744, -516.0965694917076, 0
    ],
    [
      2124.3567217780205, -516.5889188235196, 0,
      2130.1355406227385, -522.0047605486237, 0,
      2133.3045703123307, -521.5124113727692, 0,
      2126.9665109347056, -516.0965694917076, 0,
      2124.3567217780205, -516.5889188235196, 0
    ],
    [
      2094.7169735121156, -500.34138289649616, 0,
      2100.682205867802, -505.75722999589624, 0,
      2103.8512355573944, -505.26488033033513, 0,
      2097.5131761797697, -499.84903306873923, 0,
      2094.7169735121156, -500.34138289649616, 0
    ],
    [
      2099.9365518223667, -489.7558583737413, 0,
      2115.595286756239, -461.19952549423874, 0,
      2164.249213155019, -488.0326328092501, 0,
      2148.0312376897987, -517.5736174559521, 0,
      2099.9365518223667, -489.7558583737413, 0
    ],
    [
      2136.846427022301, -487.54028261031436, 0,
      2148.0312376897987, -493.69465899673156, 0,
      2149.70895928852, -490.49438356531414, 0,
      2138.524148624141, -484.3400059717858, 0,
      2136.846427022301, -487.54028261031436, 0
    ],
    [
      2135.727945956487, -500.34138289649616, 0,
      2135.9143594658967, -503.5416563956, 0,
      2140.9475242667386, -506.2495796458616, 0,
      2142.2524188435214, -503.7878312619114, 0,
      2135.727945956487, -500.34138289649616, 0
    ],
    [
      1040.79906133289, -561.036725749287, 0,
      1105.48454968904, -443.82812492909505, 0,
      1154.8841301332552, -472.14540590251454, 0,
      1166.2553543117217, -451.95395840484724, 0,
      1375.9705543124844, -569.1625009593117, 0,
      1239.7022776896529, -670.1187652275295, 0,
      1220.128859022312, -633.6760880847884, 0,
      1208.9440483548144, -653.3748425701879, 0,
      1040.79906133289, -561.036725749287, 0
    ],
    [
      1233.550631822997, -645.2491092253985, 0,
      1248.8365397318128, -653.8673111315198, 0,
      1255.1745991125567, -642.7867649854892, 0,
      1239.5158641786838, -633.9223226578747, 0,
      1233.550631822997, -645.2491092253985, 0
    ],
    [
      1116.1101198220708, -527.3024036610569, 0,
      1131.5824412449747, -535.674431698995, 0,
      1137.9205006225993, -524.5938054407083, 0,
      1122.2617656902862, -515.7292990223531, 0,
      1116.1101198220708, -527.3024036610569, 0
    ],
    [
      800.1392184894389, -2672.1250823218265, 0,
      836.117026132969, -2614.2670681535656, 0,
      893.9052145770276, -2650.212922320069, 0,
      848.4203178678401, -2724.8126277570186, 0,
      800.1392184894389, -2672.1250823218265, 0
    ],
    [
      856.9953393786525, -2666.95480002193, 0,
      866.1296014239315, -2671.8788784396197, 0,
      869.6714581339021, -2665.4775762093495, 0,
      860.5371960886231, -2660.553495865585, 0,
      856.9953393786525, -2666.95480002193, 0
    ],
    [
      846.1833557346525, -2647.9970842766515, 0,
      852.8942421326558, -2651.6901475097543, 0,
      857.554579913119, -2642.5805900284254, 0,
      851.0301070214061, -2638.887524736683, 0,
      846.1833557346525, -2647.9970842766515, 0
    ],
    [
      824.7458019545024, -2657.845251046524, 0,
      833.8800639997814, -2663.0155362253963, 0,
      837.6083342238402, -2656.614230526631, 0,
      828.4740721785612, -2651.1977391277487, 0,
      824.7458019545024, -2657.845251046524, 0
    ],
    [
      794.7332266682188, -2774.545575623257, 0,
      816.1707804452496, -2736.630371645081, 0,
      892.9731470221825, -2777.0075988137055, 0,
      861.8420906685253, -2837.819453994779, 0,
      801.444113066222, -2806.5518482032776, 0,
      813.5609912901241, -2785.1322727188235, 0,
      794.7332266682188, -2774.545575623257, 0
    ],
    [
      853.2670691545937, -2782.6702507464033, 0,
      859.4187150212496, -2786.3632835631124, 0,
      864.4518798220913, -2777.253801114503, 0,
      858.3002339554355, -2773.806968591419, 0,
      853.2670691545937, -2782.6702507464033, 0
    ],
    [
      853.2670691545937, -2804.3360313544863, 0,
      862.2149176889037, -2809.5062702108576, 0,
      865.7567743988743, -2803.105021865468, 0,
      856.8089258676835, -2797.934780983209, 0,
      853.2670691545937, -2804.3360313544863, 0
    ],
    [
      830.1517937772823, -2807.044251909677, 0,
      836.8626801784046, -2810.737279219526, 0,
      841.5230179557487, -2801.8740122797567, 0,
      834.812131556186, -2798.1809829658537, 0,
      830.1517937772823, -2807.044251909677, 0
    ],
    [
      923.91778986799, -2480.8235484254265, 0,
      976.2999864892688, -2432.8131596033704, 0,
      1034.0881749348869, -2469.0056196450514, 0,
      997.7375402662997, -2526.61794177743, 0,
      923.91778986799, -2480.8235484254265, 0
    ],
    [
      996.9918862208641, -2485.747682897366, 0,
      1006.312561777112, -2490.9180224929337, 0,
      1010.2272455105802, -2484.024236001089, 0,
      1000.7201564449228, -2478.8538942189966, 0,
      996.9918862208641, -2485.747682897366, 0
    ],
    [
      985.6206620455167, -2466.789757046123, 0,
      992.3315484450795, -2470.482861202478, 0,
      997.5511267553306, -2461.3732027620517, 0,
      990.8402403573275, -2457.680096545498, 0,
      985.6206620455167, -2466.789757046123, 0
    ],
    [
      977.2320540456733, -2499.0428385611244, 0,
      983.7565269342671, -2502.7359354405016, 0,
      988.7896917351089, -2493.380088398586, 0,
      982.0788053324269, -2489.933196037722, 0,
      977.2320540456733, -2499.0428385611244, 0
    ],
    [
      829.4061397349658, -2561.086755395469, 0,
      860.3507825776541, -2500.273870944706, 0,
      929.8830222205576, -2514.8000460927997, 0,
      889.244876801243, -2592.108625525092, 0,
      829.4061397349658, -2561.086755395469, 0
    ],
    [
      856.8089258676835, -2535.48135793735, 0,
      865.7567743988743, -2540.6516818077216, 0,
      869.4850446229331, -2534.4965341536904, 0,
      860.5371960886231, -2529.32620833229, 0,
      856.8089258676835, -2535.48135793735, 0
    ],
    [
      880.6698552904306, -2558.6246996925574, 0,
      889.8041173325904, -2564.041221757366, 0,
      893.5323875566492, -2557.886082905577, 0,
      884.3981255113702, -2552.469558805523, 0,
      880.6698552904306, -2558.6246996925574, 0
    ],
    [
      857.7409934225285, -2561.82537203585, 0,
      864.4518798220913, -2565.2722492501193, 0,
      869.4850446229331, -2555.670232357486, 0,
      862.9605717343393, -2552.223353120447, 0,
      857.7409934225285, -2561.82537203585, 0
    ],
    [
      1424.438067200295, -2295.6750160828906, 0,
      1438.6054940432966, -2306.015813864121, 0,
      1473.0919935990746, -2264.6525835112056, 0,
      1500.8676067568495, -2277.455499326887, 0,
      1522.3051605338803, -2244.463349743122, 0,
      1499.3762986659783, -2229.4445133310314, 0,
      1528.6432199115052, -2201.376486979347, 0,
      1528.083979378598, -2326.204971632548, 0,
      1631.3570645334037, -2390.4654175783317, 0,
      1556.7916600896585, -2512.091777129956, 0,
      1455.382710044543, -2446.6007728708864, 0,
      1424.438067200295, -2295.6750160828906, 0
    ],
    [
      1460.4158748438251, -2296.9060637846187, 0,
      1475.7017827573195, -2320.2959524225143, 0,
      1499.0034716456, -2303.7999291738106, 0,
      1483.5311502226962, -2281.6410657891183, 0,
      1460.4158748438251, -2296.9060637846187, 0
    ],
    [
      1522.4915740432898, -2358.950747675724, 0,
      1562.3840654218477, -2385.0488380104284, 0,
      1577.4835598228133, -2362.1514591082077, 0,
      1537.5910684458152, -2336.053332221741, 0,
      1522.4915740432898, -2358.950747675724, 0
    ],
    [
      1450.9087857781678, -2341.469928021703, 0,
      1455.382710044543, -2360.4279991848, 0,
      1511.1203498663829, -2347.3789395711033, 0,
      1506.8328391109767, -2328.6670623338855, 0,
      1450.9087857781678, -2341.469928021703, 0
    ],
    [
      1771.353611377175, -1796.846860756598, 0,
      1855.6125184006657, -1752.0352942786046, 0,
      1882.828891023974, -1826.1466647317277, 0,
      1868.2886371559152, -1849.0447943167298, 0,
      1843.6820536877326, -1833.533161648497, 0,
      1842.5635726219186, -1811.127444045, 0,
      1817.3977486223885, -1827.8701809791921, 0,
      1771.353611377175, -1796.846860756598, 0
    ],
    [
      1854.3076238238828, -1835.2566771224122, 0,
      1866.7973290666037, -1843.8742517284204, 0,
      1875.3723505789756, -1831.0709963807528, 0,
      1862.696231823726, -1822.699631694067, 0,
      1854.3076238238828, -1835.2566771224122, 0
    ],
    [
      1844.241294222199, -1785.0284375643892, 0,
      1856.9174129774487, -1793.646038653543, 0,
      1865.3060209788516, -1780.8427439718307, 0,
      1852.6299022220426, -1772.4713535646315, 0,
      1844.241294222199, -1785.0284375643892, 0
    ],
    [
      120.59789084384096, -448.55059194289186, 0,
      181.36869546652267, -380.1478709126728, 0,
      263.2042268442973, -393.92685930230743, 0,
      291.35266702245053, -376.7031220038176, 0,
      293.40321564466916, -342.50164706112, 0,
      152.4746012444934, -307.0698278568256, 0,
      230.39544888879985, -148.60991983424873, 0,
      263.0178133333283, -157.96008123130795, 0,
      315.21359644519765, -104.07355142788744, 0,
      332.36363946682235, -51.66319467641198, 0,
      280.5406833784506, -37.14574222431198, 0,
      302.3510641789791, 0.009152366744540645, 0,
      346.9038933333215, 0.009152366744540645, 0,
      350.2593365323231, -24.842806339261507, 0,
      400.9638115564404, 0.009152366744540645, 0,
      471.05529173225096, -52.64742827940619, 0,
      636.2176625786714, -72.5781459043456, 0,
      625.2192654221428, -101.61297505686161, 0,
      518.0314965323096, -79.22171305402092, 0,
      485.5955455987501, -215.04516124696403, 0,
      581.2256767991478, -249.246902585371, 0,
      567.4310769765247, -277.0511432171904, 0,
      459.87048106787256, -225.87161947320934, 0,
      367.78220657744544, -264.74838770168424, 0,
      309.2483640879513, -364.89254881457856, 0,
      313.163047822979, -453.7176923429902, 0,
      290.23418595507695, -527.2871830201702, 0,
      120.59789084384096, -448.55059194289186, 0
    ],
    [
      260.9672647111097, -219.9662795114879, 0,
      295.8265912872662, -321.09493213275874, 0,
      315.21359644519765, -260.5654487227637, 0,
      354.36043377676026, -255.64434266815357, 0,
      451.85470008840764, -172.72348308817882, 0,
      469.37757013352996, -117.36065745370027, 0,
      452.7867676448122, -66.42669244403517, 0,
      408.6067655108482, -26.073100348228014, 0,
      350.2593365323231, -31.978510283407527, 0,
      338.70169884444715, -100.87480207662064, 0,
      263.9498808881733, -182.56574359101575, 0,
      260.9672647111097, -219.9662795114879, 0
    ],
    [
      436.3823786655039, -210.616153547976, 0,
      480.5623808010275, -213.32276951088423, 0,
      482.6129294216865, -116.3764277449652, 0,
      471.2417052463391, -157.96008123130795, 0,
      436.3823786655039, -210.616153547976, 0
    ],
    [
      143.52675271018347, -435.2637548377406, 0,
      148.55991751102522, -460.60715701505, 0,
      293.2168021337001, -487.1807792759044, 0,
      303.8423722667311, -435.0177021937738, 0,
      294.14886969010473, -394.4189658113883, 0,
      270.8471808018242, -403.76898675466947, 0,
      206.72093297858135, -388.7597400173136, 0,
      143.52675271018347, -435.2637548377406, 0
    ],
    [
      473.10584035446954, -76.26901687697648, 0,
      479.0710727117159, -96.1997057371119, 0,
      496.0347022223716, -125.72660755904732, 0,
      511.3206101343063, -76.26901687697648, 0,
      473.10584035446954, -76.26901687697648, 0
    ],
    [
      198.33232497873797, -285.9091214660864, 0,
      266.1868430213609, -321.5870408377215, 0,
      251.46017564389277, -189.20926607913762, 0,
      220.70194631217348, -198.31334808239714, 0,
      198.33232497873797, -285.9091214660864, 0
    ],
  ]
};

},{}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

},{}]},{},[1]);

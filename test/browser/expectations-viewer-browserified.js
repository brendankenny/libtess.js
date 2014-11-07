require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"../libtess.min.js":[function(require,module,exports){
/* jshint node: true */

// stub to let the browserified tests use the page-provided libtess
module.exports = window.libtess;

},{}],1:[function(require,module,exports){
/* jshint node: true */
'use strict';

var VIEW_BOUNDS_EXCESS = 0.05;

var common = require('./common.js');

// geometry tests are both in test/geometry/ and in third_party/test/geometry/
var rfolder = require('./rfolder.js');
var geometryFiles = {"degenerate-hourglass": require("./geometry/degenerate-hourglass.js"),"hourglass": require("./geometry/hourglass.js"),"letter-e": require("./geometry/letter-e.js"),"shared-borders": require("./geometry/shared-borders.js"),"shared-edge-triangles": require("./geometry/shared-edge-triangles.js"),"two-opposite-triangles": require("./geometry/two-opposite-triangles.js"),"two-triangles": require("./geometry/two-triangles.js")};
var geometries = Object.keys(geometryFiles).map(function(filename) {
  return geometryFiles[filename];
});
var thirdPartyFiles = {"poly2tri-dude": require("./../third_party/test/geometry/poly2tri-dude.js"),"roboto-registered": require("./../third_party/test/geometry/roboto-registered.js")};
var thirdPartyGeometries = Object.keys(thirdPartyFiles).map(function(filename) {
  return thirdPartyFiles[filename];
});
geometries.push.apply(geometries, thirdPartyGeometries);

var updateScheduled = false;
var geometrySelect;
var outputSelect;
var provideNormalSelect;
var windingSelect;
var inputSvg;

function init() {
  geometrySelect = document.querySelector('#test-geometry');
  outputSelect = document.querySelector('#output-types');
  provideNormalSelect = document.querySelector('#provide-normal');
  windingSelect = document.querySelector('#winding-rule');

  inputSvg = document.querySelector('#input-contours');

  optionsToOptions(geometries, geometrySelect);
  optionsToOptions(common.OUTPUT_TYPES, outputSelect);
  optionsToOptions(common.PROVIDE_NORMAL, provideNormalSelect);
  // TODO(bckenny): maybe add this back when switch to more general transforms
  // optionsToOptions(common.NORMALS, document.querySelector('#test-geometry'));
  optionsToOptions(common.WINDING_RULES, windingSelect);

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
  var scale = inputSvg.offsetWidth / contoursSize;
  var dX = -scale * (bounds.minX + bounds.maxX - contoursSize) / 2;
  var dY = scale * (bounds.minY + bounds.maxY + contoursSize) / 2;

  // clear current content
  while (inputSvg.firstChild) {
    inputSvg.removeChild(inputSvg.firstChild);
  }
  // draw input contours
  for (var i = 0; i < contours.length; i++) {
    var contour = contours[i];
    if (contour.length < 6) {
      continue;
    }

    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    var pathString = 'M' + (contour[0] * scale + dX) + ',' +
        (contour[1] * -scale + dY) + ' ';
    for (var j = 3; j < contour.length; j += 3) {
      pathString += 'L' + (contour[j] * scale + dX) + ',' +
          (contour[j + 1] * -scale + dY) + ' ';
    }
    pathString += 'Z';
    path.setAttribute('d', pathString);
    inputSvg.appendChild(path);
  }
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

},{"./../third_party/test/geometry/poly2tri-dude.js":11,"./../third_party/test/geometry/roboto-registered.js":12,"./common.js":3,"./geometry/degenerate-hourglass.js":4,"./geometry/hourglass.js":5,"./geometry/letter-e.js":6,"./geometry/shared-borders.js":7,"./geometry/shared-edge-triangles.js":8,"./geometry/two-opposite-triangles.js":9,"./geometry/two-triangles.js":10,"./rfolder.js":2}],2:[function(require,module,exports){

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

},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

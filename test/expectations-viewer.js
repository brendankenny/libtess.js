/* jshint node: true */
'use strict';

var common = require('./common.js');
var libtess = common.libtess;
var createTessellator = common.createInstrumentedTessellator;
var tessellate = common.tessellate;

var basetess = require('./expectations/libtess.baseline.js');

// geometry tests are both in test/geometry/ and in third_party/test/geometry/
var rfolder = require('./rfolder.js');
var geometryFiles = rfolder('./geometry');
var geometries = Object.keys(geometryFiles).map(function(filename) {
  return geometryFiles[filename];
});
var thirdPartyFiles = rfolder('../third_party/test/geometry');
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

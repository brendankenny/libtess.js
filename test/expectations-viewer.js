/* jshint node: true */
'use strict';

var VIEW_BOUNDS_EXCESS = 0.02;
var NORMAL = {
  name: 'xyPlane',
  value: [0, 0, 1],
};

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

var updateScheduled = false;
var geometrySelect;
var outputSelect;
var provideNormalSelect;
var windingSelect;
var inputSvg;
var resultSvg;
var expectationSvg;

function init() {
  geometrySelect = document.querySelector('#test-geometry');
  outputSelect = document.querySelector('#output-types');
  provideNormalSelect = document.querySelector('#provide-normal');
  windingSelect = document.querySelector('#winding-rule');

  inputSvg = document.querySelector('#input-contours');
  resultSvg = document.querySelector('#output-result');
  expectationSvg = document.querySelector('#output-expectation');

  optionsToOptions(geometries, geometrySelect);
  optionsToOptions(common.OUTPUT_TYPES, outputSelect);
  optionsToOptions(common.PROVIDE_NORMAL, provideNormalSelect);
  // TODO(bckenny): maybe add this back when switch to more general transforms
  // optionsToOptions(common.NORMALS, document.querySelector('#test-geometry'));
  optionsToOptions(common.WINDING_RULES, windingSelect);

  // pick a more interesting default geometry
  geometrySelect.children[2].selected = true;

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
  var i;
  var j;
  var path;
  var pathString;

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
  for (i = 0; i < contours.length; i++) {
    var contour = contours[i];
    if (contour.length < 6) {
      continue;
    }

    path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathString = 'M' + (contour[0] * scale + dX) + ',' +
        (contour[1] * -scale + dY);
    for (j = 3; j < contour.length; j += 3) {
      pathString += 'L' + (contour[j] * scale + dX) + ',' +
          (contour[j + 1] * -scale + dY);
    }
    pathString += 'Z';
    path.setAttribute('d', pathString);
    inputSvg.appendChild(path);
  }

  var outputType = common.OUTPUT_TYPES[parseInt(outputSelect.value)];
  var provideNormal =
      common.PROVIDE_NORMAL[parseInt(provideNormalSelect.value)];
  var windingRule = common.WINDING_RULES[parseInt(windingSelect.value)];

  // result
  var tessellator = createTessellator(libtess, outputType);
  var results = tessellate(tessellator, geometry.value, outputType,
      provideNormal, NORMAL, windingRule);

  // expectation
  var baselineTessellator = createTessellator(basetess, outputType);
  var expectation = tessellate(baselineTessellator, geometry.value, outputType,
      provideNormal, NORMAL, windingRule);

  if (outputType.value) {
    // TODO(bckenny)
  } else {
    drawTriangleResults(resultSvg, results, scale, dX, dY);
    drawTriangleResults(expectationSvg, expectation, scale, dX, dY);
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
  // draw input contours
  for (var i = 0; i < results.length; i++) {
    var result = results[i];
    if (result.length < 9) {
      throw new Error('result with invalid geometry emitted');
    }

    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
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
    path.setAttribute('d', pathString);
    svgCanvas.appendChild(path);
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

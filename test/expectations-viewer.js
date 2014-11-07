/* jshint node: true */
'use strict';

var VIEW_BOUNDS_EXCESS = 0.05;

var common = require('./common.js');

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

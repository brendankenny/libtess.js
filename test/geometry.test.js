/* jshint node: true */
/* global suite, test */
'use strict';

var chai = require('chai');
var assert = chai.assert;

var libtess = require('../libtess.min.js');
var basetess = require('./expectations/libtess.baseline.js');

var common = require('./common.js');
var createTessellator = common.createInstrumentedTessellator;

var rfolder = require('./rfolder.js');
var geometryFiles = rfolder('./geometry');
var geometries = Object.keys(geometryFiles).map(function(filename) {
  return geometryFiles[filename];
});

/**
 * Enumeration of supported winding rules.
 * @private {Array.<{name: string, value: boolean}>}
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
 * @private {Array.<{name: string, value: boolean}>}
 * @const
 */
var NORMALS = [
  {
    name: 'xyPlane',
    value: [0, 0, 1],
  },
  { // TODO(bckenny): support other normals
    name: 'xzPlane',
    value: [0, 1, 0],
  },
  {
    name: 'yzPlane',
    value: [1, 0, 0]
  }
  // TODO(bckenny): arbitrary orientations? other permutations?
];

/**
 * Whether to provide a normal to libtess or make it compute one.
 * @private {Array.<{name: string, value: boolean}>}
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
 * @private {Array.<{name: string, value: boolean}>}
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
 * @param {{name: string, value: boolean}} normal
 * @param {{name: string, value: boolean}} windingRule
 * @return {!Array.<!Array.<number>>}
 */
function tessellate(tess, contours, outputType, provideNormal, normal,
    windingRule) {

  // winding rule
  tess.gluTessProperty(libtess.gluEnum.GLU_TESS_WINDING_RULE,
      windingRule.value);

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
      var coords = [contour[j], contour[j + 1], contour[j + 2]];
      // TODO(bckenny): rotate coordinates based on new normal
      tess.gluTessVertex(coords, coords);
    }
    tess.gluTessEndContour();
  }

  tess.gluTessEndPolygon();

  return resultVerts;
}

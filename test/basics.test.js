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

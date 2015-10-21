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

  suite('Polygon data and callbacks', function() {
    // Tessellation without data callbacks.
    var noDataArguments = {
      begin: -1,
      vertex: -1,
      edge: -1,
      combine: -1,
      end: -1
    };

    var noDataVerts = [];
    function beginCallback(type) {
      noDataArguments.begin = arguments.length;
    }
    function vertexCallback(vertData) {
      noDataArguments.vertex = arguments.length;
      noDataVerts.push(vertData[0], vertData[1], vertData[2]);
    }
    function edgeCallback(flag) {
      noDataArguments.edge = arguments.length;
    }
    function combineCallback(coords, vertData, weight) {
      noDataArguments.combine = arguments.length;
      return [coords[0], coords[1], coords[2]];
    }
    function endCallback() {
      noDataArguments.end = arguments.length;
    }

    var noTess = new libtess.GluTesselator();
    noTess.gluTessCallback(libtess.gluEnum.GLU_TESS_BEGIN, beginCallback);
    noTess.gluTessCallback(libtess.gluEnum.GLU_TESS_VERTEX, vertexCallback);
    noTess.gluTessCallback(libtess.gluEnum.GLU_TESS_END, endCallback);
    noTess.gluTessCallback(libtess.gluEnum.GLU_TESS_COMBINE, combineCallback);
    noTess.gluTessCallback(libtess.gluEnum.GLU_TESS_EDGE_FLAG, edgeCallback);
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

    // Tessellation with data callbacks.
    var dataArguments = {
      begin: -1,
      vertex: -1,
      edge: -1,
      combine: -1,
      end: -1
    };

    var dataVerts = [];
    function beginDataCallback(type, data) {
      dataArguments.begin = arguments.length;
      assert.strictEqual(data, dataVerts,
          'GLU_TESS_BEGIN_DATA callback data incorrect');
    }
    function vertexDataCallback(vertData, data) {
      dataArguments.vertex = arguments.length;
      data.push(vertData[0], vertData[1], vertData[2]);
      assert.strictEqual(data, dataVerts,
          'GLU_TESS_VERTEX_DATA callback data incorrect');
    }
    function edgeDataCallback(flag, data) {
      dataArguments.edge = arguments.length;
      assert.strictEqual(data, dataVerts,
          'GLU_TESS_EDGE_FLAG_DATA callback data incorrect');
    }
    function combineDataCallback(coords, vertData, weight, data) {
      dataArguments.combine = arguments.length;
      assert.strictEqual(data, dataVerts,
          'GLU_TESS_COMBINE_DATA callback data incorrect');
      return [coords[0], coords[1], coords[2]];
    }
    function endDataCallback(data) {
      dataArguments.end = arguments.length;
      assert.strictEqual(data, dataVerts,
          'GLU_TESS_END_DATA callback data incorrect');
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
    test('begin callback should return with and without data', function() {
      assert.strictEqual(noDataArguments.begin, 1,
        'GLU_TESS_BEGIN callback called with ' + noDataArguments.begin +
        ' arguments');
      assert.strictEqual(dataArguments.begin, 2,
        'GLU_TESS_BEGIN_DATA callback called with ' + dataArguments.begin +
        ' arguments');
    });
    test('vertex callback should return with and without data', function() {
      assert.strictEqual(noDataArguments.vertex, 1,
        'GLU_TESS_VERTEX callback called with ' + noDataArguments.vertex +
        ' arguments');
      assert.strictEqual(dataArguments.vertex, 2,
        'GLU_TESS_VERTEX_DATA callback called with ' + dataArguments.vertex +
        ' arguments');
    });
    test('edge flag callback should return with and without data', function() {
      assert.strictEqual(noDataArguments.edge, 1,
        'GLU_TESS_EDGE_FLAG callback called with ' + noDataArguments.edge +
        ' arguments');
      assert.strictEqual(dataArguments.edge, 2,
        'GLU_TESS_EDGE_FLAG_DATA callback called with ' + dataArguments.edge +
        ' arguments');
    });
    test('combine callback should return with and without data', function() {
      assert.strictEqual(noDataArguments.combine, 3,
        'GLU_TESS_COMBINE callback called with ' + noDataArguments.combine +
        ' arguments');
      assert.strictEqual(dataArguments.combine, 4,
        'GLU_TESS_COMBINE_DATA callback called with ' + dataArguments.combine +
        ' arguments');
    });
    test('end callback should return with and without data', function() {
      assert.strictEqual(noDataArguments.end, 0,
        'GLU_TESS_END callback called with ' + noDataArguments.end +
        ' arguments');
      assert.strictEqual(dataArguments.end, 1,
        'GLU_TESS_END_DATA callback called with ' + dataArguments.end +
        ' arguments');
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

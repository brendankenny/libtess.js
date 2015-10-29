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

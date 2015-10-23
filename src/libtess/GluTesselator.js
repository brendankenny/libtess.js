/**
 * Copyright 2000, Silicon Graphics, Inc. All Rights Reserved.
 * Copyright 2015, Google Inc. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice including the dates of first publication and
 * either this permission notice or a reference to http://oss.sgi.com/projects/FreeB/
 * shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * SILICON GRAPHICS, INC. BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
 * IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * Original Code. The Original Code is: OpenGL Sample Implementation,
 * Version 1.2.1, released January 26, 2000, developed by Silicon Graphics,
 * Inc. The Original Code is Copyright (c) 1991-2000 Silicon Graphics, Inc.
 * Copyright in any portions created by third parties is as indicated
 * elsewhere herein. All Rights Reserved.
 */

/* global libtess */

// TODO(bckenny): create more javascript-y API, e.g. make gluTessEndPolygon
// async, don't require so many temp objects created

/**
 * The tesselator main class, providing the public API.
 * @constructor
 * @struct
 */
libtess.GluTesselator = function() {
  // Only initialize fields which can be changed by the api. Other fields
  // are initialized where they are used.

  // TODO(bckenny): many of these can be made private
  // TODO(bckenny): can we combine call* and call*Data functions?

  /*** state needed for collecting the input data ***/

  /**
   * what begin/end calls have we seen?
   * @type {libtess.GluTesselator.tessState_}
   */
  this.state = libtess.GluTesselator.tessState_.T_DORMANT;

  /**
   * lastEdge_.org is the most recent vertex
   * @private
   * @type {libtess.GluHalfEdge}
   */
  this.lastEdge_ = null;

  /**
   * stores the input contours, and eventually the tessellation itself
   * @type {libtess.GluMesh}
   */
  this.mesh = null;

  /**
   * Error callback.
   * @private
   * @type {?function((libtess.errorType|libtess.gluEnum), Object=)}
   */
  this.errorCallback_ = null;

  /*** state needed for projecting onto the sweep plane ***/

  /**
   * user-specified normal (if provided)
   * @type {!Array.<number>}
   */
  this.normal = [0, 0, 0];
  // TODO(bckenny): better way to init these arrays?

  /**
   * unit vector in s-direction (debugging)
   * @type {!Array.<number>}
   */
  this.sUnit = [0, 0, 0];

  /**
   * unit vector in t-direction (debugging)
   * @type {!Array.<number>}
   */
  this.tUnit = [0, 0, 0];

  /*** state needed for the line sweep ***/
  // TODO(bckenny): this could be moved to a sweep state object of some sort

  /**
   * tolerance for merging features
   * @type {number}
   */
  this.relTolerance = libtess.GLU_TESS_DEFAULT_TOLERANCE;

  /**
   * rule for determining polygon interior
   * @type {libtess.windingRule}
   */
  this.windingRule = libtess.windingRule.GLU_TESS_WINDING_ODD;

  /**
   * fatal error: needed combine callback
   * @type {boolean}
   */
  this.fatalError = false;

  /**
   * edge dictionary for sweep line
   * @type {libtess.Dict}
   */
  this.dict = null;
  // NOTE(bckenny): dict initialized in sweep.initEdgeDict_, removed in sweep.doneEdgeDict_

  /**
   * priority queue of vertex events
   * @type {libtess.PriorityQ}
   */
  this.pq = null;
  // NOTE(bckenny): pq initialized in sweep.initPriorityQ

  /**
   * current sweep event being processed
   * @type {libtess.GluVertex}
   */
  this.event = null;

  /**
   * Combine callback.
   * @private
   * @type {?function(Array<number>, Array<Object>, Array<number>, Object=): Object}
   */
  this.combineCallback_ = null;

  /*** state needed for rendering callbacks (see render.js) ***/

  /**
   * Extract contours, not triangles
   * @type {boolean}
   */
  this.boundaryOnly = false;

  /**
   * Begin callback.
   * @private
   * @type {?function(libtess.primitiveType, Object=)}
   */
  this.beginCallback_ = null;

  /**
   * Edge flag callback.
   * @private
   * @type {?function(boolean, Object=)}
   */
  this.edgeFlagCallback_ = null;

  /**
   * Vertex callback.
   * @private
   * @type {?function(Object, Object=)}
   */
  this.vertexCallback_ = null;

  /**
   * End callback.
   * @private
   * @type {?function(Object=)}
   */
  this.endCallback_ = null;

  /**
   * Mesh callback.
   * @private
   * @type {?function(libtess.GluMesh)}
   */
  this.meshCallback_ = null;

  /**
   * client data for current polygon
   * @private
   * @type {Object}
   */
  this.polygonData_ = null;
};

/**
 * The begin/end calls must be properly nested. We keep track of the current
 * state to enforce the ordering.
 * @enum {number}
 * @private
 */
libtess.GluTesselator.tessState_ = {
  T_DORMANT: 0,
  T_IN_POLYGON: 1,
  T_IN_CONTOUR: 2
};

/**
 * Destory the tesselator object. See README.
 */
libtess.GluTesselator.prototype.gluDeleteTess = function() {
  // TODO(bckenny): This does nothing but assert that it isn't called while
  // building the polygon since we rely on GC to handle memory. *If* the public
  // API changes, this should go.
  this.requireState_(libtess.GluTesselator.tessState_.T_DORMANT);
  // memFree(tess); TODO(bckenny)
};


/**
 * Set properties for control over tesselation. See README.
 * @param {libtess.gluEnum} which [description].
 * @param {number|boolean} value [description].
 */
libtess.GluTesselator.prototype.gluTessProperty = function(which, value) {
  // TODO(bckenny): split into more setters?
  // TODO(bckenny): in any case, we can do better than this switch statement

  switch (which) {
    case libtess.gluEnum.GLU_TESS_TOLERANCE:
      if (value < 0 || value > 1) {
        break;
      }
      // TODO(bckenny): libtess doesn't support any tolerance but 0. This should
      // reject any non-zero tolerance accordingly.
      this.relTolerance = /** @type {number} */(value);
      return;

    case libtess.gluEnum.GLU_TESS_WINDING_RULE:
      var windingRule = /** @type {libtess.windingRule} */(value);

      switch (windingRule) {
        case libtess.windingRule.GLU_TESS_WINDING_ODD:
        case libtess.windingRule.GLU_TESS_WINDING_NONZERO:
        case libtess.windingRule.GLU_TESS_WINDING_POSITIVE:
        case libtess.windingRule.GLU_TESS_WINDING_NEGATIVE:
        case libtess.windingRule.GLU_TESS_WINDING_ABS_GEQ_TWO:
          this.windingRule = windingRule;
          return;
        default:
      }
      break;

    case libtess.gluEnum.GLU_TESS_BOUNDARY_ONLY:
      // TODO(bckenny): added boolean param type. make sure ok.
      this.boundaryOnly = !!value;
      return;

    default:
      this.callErrorCallback(libtess.gluEnum.GLU_INVALID_ENUM);
      return;
  }
  this.callErrorCallback(libtess.gluEnum.GLU_INVALID_VALUE);
};


/**
 * Returns tessellator property
 * @param {libtess.gluEnum} which [description].
 * @return {number|boolean} [description].
 */
libtess.GluTesselator.prototype.gluGetTessProperty = function(which) {
  // TODO(bckenny): as above, split into more getters? and improve on switch statement
  // why are these being asserted in getter but not setter?

  switch (which) {
    case libtess.gluEnum.GLU_TESS_TOLERANCE:
      // tolerance should be in range [0..1]
      libtess.assert(0 <= this.relTolerance && this.relTolerance <= 1);
      return this.relTolerance;

    case libtess.gluEnum.GLU_TESS_WINDING_RULE:
      var rule = this.windingRule;
      libtess.assert(rule === libtess.windingRule.GLU_TESS_WINDING_ODD ||
          rule === libtess.windingRule.GLU_TESS_WINDING_NONZERO ||
          rule === libtess.windingRule.GLU_TESS_WINDING_POSITIVE ||
          rule === libtess.windingRule.GLU_TESS_WINDING_NEGATIVE ||
          rule === libtess.windingRule.GLU_TESS_WINDING_ABS_GEQ_TWO);
      return rule;

    case libtess.gluEnum.GLU_TESS_BOUNDARY_ONLY:
      libtess.assert(this.boundaryOnly === true || this.boundaryOnly === false);
      return this.boundaryOnly;

    default:
      this.callErrorCallback(libtess.gluEnum.GLU_INVALID_ENUM);
      break;
  }
  return false;
};


/**
 * Lets the user supply the polygon normal, if known.  All input data
 * is projected into a plane perpendicular to the normal before
 * tesselation. All output triangles are oriented CCW with
 * respect to the normal (CW orientation can be obtained by
 * reversing the sign of the supplied normal). For example, if
 * you know that all polygons lie in the x-y plane, call
 * "tess.gluTessNormal(0.0, 0.0, 1.0)" before rendering any polygons.
 *
 * @param {number} x [description].
 * @param {number} y [description].
 * @param {number} z [description].
 */
libtess.GluTesselator.prototype.gluTessNormal = function(x, y, z) {
  this.normal[0] = x;
  this.normal[1] = y;
  this.normal[2] = z;
};


/**
 * Specify callbacks. See README for callback descriptions. A null or undefined
 * opt_fn removes current callback.
 *
 * @param {libtess.gluEnum} which The callback-type gluEnum value.
 * @param {?Function=} opt_fn
 */
libtess.GluTesselator.prototype.gluTessCallback = function(which, opt_fn) {
  var fn = !opt_fn ? null : opt_fn;
  // TODO(bckenny): better opt_fn typing?
  // TODO(bckenny): should add documentation that references in callback are volatile (or make a copy)

  switch (which) {
    case libtess.gluEnum.GLU_TESS_BEGIN:
    case libtess.gluEnum.GLU_TESS_BEGIN_DATA:
      this.beginCallback_ = /** @type {?function(libtess.primitiveType, Object=)} */ (fn);
      return;

    case libtess.gluEnum.GLU_TESS_EDGE_FLAG:
    case libtess.gluEnum.GLU_TESS_EDGE_FLAG_DATA:
      this.edgeFlagCallback_ = /** @type {?function(boolean, Object=)} */ (fn);
      return;

    case libtess.gluEnum.GLU_TESS_VERTEX:
    case libtess.gluEnum.GLU_TESS_VERTEX_DATA:
      this.vertexCallback_ = /** @type {?function(Object, Object=)} */ (fn);
      return;

    case libtess.gluEnum.GLU_TESS_END:
    case libtess.gluEnum.GLU_TESS_END_DATA:
      this.endCallback_ = /** @type {?function(Object=)} */ (fn);
      return;

    case libtess.gluEnum.GLU_TESS_ERROR:
    case libtess.gluEnum.GLU_TESS_ERROR_DATA:
      this.errorCallback_ = /** @type {?function((libtess.errorType|libtess.gluEnum), Object=)} */ (fn);
      return;

    case libtess.gluEnum.GLU_TESS_COMBINE:
    case libtess.gluEnum.GLU_TESS_COMBINE_DATA:
      this.combineCallback_ = /** @type {?function(Array<number>, Array<Object>, Array<number>, Object=): Object} */ (fn);
      return;

    case libtess.gluEnum.GLU_TESS_MESH:
      this.meshCallback_ = /** @type {?function(libtess.GluMesh)} */ (fn);
      return;

    default:
      this.callErrorCallback(libtess.gluEnum.GLU_INVALID_ENUM);
      return;
  }
};


/**
 * Specify a vertex and associated data. Must be within calls to
 * beginContour/endContour. See README.
 *
 * @param {Array.<number>} coords [description].
 * @param {Object} data [description].
 */
libtess.GluTesselator.prototype.gluTessVertex = function(coords, data) {
  var tooLarge = false;

  // TODO(bckenny): pool allocation?
  var clamped = [0, 0, 0];

  this.requireState_(libtess.GluTesselator.tessState_.T_IN_CONTOUR);

  for (var i = 0; i < 3; ++i) {
    var x = coords[i];
    if (x < -libtess.GLU_TESS_MAX_COORD) {
      x = -libtess.GLU_TESS_MAX_COORD;
      tooLarge = true;
    }
    if (x > libtess.GLU_TESS_MAX_COORD) {
      x = libtess.GLU_TESS_MAX_COORD;
      tooLarge = true;
    }
    clamped[i] = x;
  }

  if (tooLarge) {
    this.callErrorCallback(libtess.errorType.GLU_TESS_COORD_TOO_LARGE);
  }

  this.addVertex_(clamped, data);
};


/**
 * [gluTessBeginPolygon description]
 * @param {Object} data Client data for current polygon.
 */
libtess.GluTesselator.prototype.gluTessBeginPolygon = function(data) {
  this.requireState_(libtess.GluTesselator.tessState_.T_DORMANT);

  this.state = libtess.GluTesselator.tessState_.T_IN_POLYGON;

  this.mesh = new libtess.GluMesh();

  this.polygonData_ = data;
};


/**
 * [gluTessBeginContour description]
 */
libtess.GluTesselator.prototype.gluTessBeginContour = function() {
  this.requireState_(libtess.GluTesselator.tessState_.T_IN_POLYGON);

  this.state = libtess.GluTesselator.tessState_.T_IN_CONTOUR;
  this.lastEdge_ = null;
};


/**
 * [gluTessEndContour description]
 */
libtess.GluTesselator.prototype.gluTessEndContour = function() {
  this.requireState_(libtess.GluTesselator.tessState_.T_IN_CONTOUR);
  this.state = libtess.GluTesselator.tessState_.T_IN_POLYGON;
};


/**
 * [gluTessEndPolygon description]
 */
libtess.GluTesselator.prototype.gluTessEndPolygon = function() {
  this.requireState_(libtess.GluTesselator.tessState_.T_IN_POLYGON);
  this.state = libtess.GluTesselator.tessState_.T_DORMANT;

  // Determine the polygon normal and project vertices onto the plane
  // of the polygon.
  libtess.normal.projectPolygon(this);

  // computeInterior(tess) computes the planar arrangement specified
  // by the given contours, and further subdivides this arrangement
  // into regions. Each region is marked "inside" if it belongs
  // to the polygon, according to the rule given by this.windingRule.
  // Each interior region is guaranteed be monotone.
  libtess.sweep.computeInterior(this);

  if (!this.fatalError) {
    // If the user wants only the boundary contours, we throw away all edges
    // except those which separate the interior from the exterior.
    // Otherwise we tessellate all the regions marked "inside".
    // NOTE(bckenny): we know this.mesh has been initialized, so help closure out.
    var mesh = /** @type {!libtess.GluMesh} */(this.mesh);
    if (this.boundaryOnly) {
      libtess.tessmono.setWindingNumber(mesh, 1, true);
    } else {
      libtess.tessmono.tessellateInterior(mesh);
    }

    this.mesh.checkMesh();

    if (this.beginCallback_ || this.endCallback_ || this.vertexCallback_ ||
        this.edgeFlagCallback_) {

      if (this.boundaryOnly) {
        // output boundary contours
        libtess.render.renderBoundary(this, this.mesh);

      } else {
        // output triangles (with edge callback if one is set)
        var flagEdges = !!this.edgeFlagCallback_;
        libtess.render.renderMesh(this, this.mesh, flagEdges);
      }
    }

    if (this.meshCallback_) {
      // Throw away the exterior faces, so that all faces are interior.
      // This way the user doesn't have to check the "inside" flag,
      // and we don't need to even reveal its existence. It also leaves
      // the freedom for an implementation to not generate the exterior
      // faces in the first place.
      libtess.tessmono.discardExterior(this.mesh);
      // user wants the mesh itself
      this.meshCallback_(this.mesh);

      this.mesh = null;
      this.polygonData_ = null;
      return;
    }
  }

  libtess.mesh.deleteMesh(this.mesh);
  this.polygonData_ = null;
  this.mesh = null;
};


/**
 * Change the tesselator state.
 * @private
 * @param {libtess.GluTesselator.tessState_} state
 */
libtess.GluTesselator.prototype.requireState_ = function(state) {
  if (this.state !== state) {
    this.gotoState_(state);
  }
};


/**
 * Change the current tesselator state one level at a time to get to the
 * desired state. Only triggered when the API is not called in the correct order
 * so an error callback is made, however the tesselator will always attempt to
 * recover afterwards (see README).
 * @private
 * @param {libtess.GluTesselator.tessState_} newState
 */
libtess.GluTesselator.prototype.gotoState_ = function(newState) {
  while (this.state !== newState) {
    if (this.state < newState) {
      switch (this.state) {
        case libtess.GluTesselator.tessState_.T_DORMANT:
          this.callErrorCallback(
              libtess.errorType.GLU_TESS_MISSING_BEGIN_POLYGON);
          this.gluTessBeginPolygon(null);
          break;

        case libtess.GluTesselator.tessState_.T_IN_POLYGON:
          this.callErrorCallback(
              libtess.errorType.GLU_TESS_MISSING_BEGIN_CONTOUR);
          this.gluTessBeginContour();
          break;
      }

    } else {
      switch (this.state) {
        case libtess.GluTesselator.tessState_.T_IN_CONTOUR:
          this.callErrorCallback(
              libtess.errorType.GLU_TESS_MISSING_END_CONTOUR);
          this.gluTessEndContour();
          break;

        case libtess.GluTesselator.tessState_.T_IN_POLYGON:
          this.callErrorCallback(
              libtess.errorType.GLU_TESS_MISSING_END_POLYGON);
          // NOTE(bckenny): libtess originally reset the tesselator, even though
          // the README claims it should spit out the tessellated results at
          // this point.
          // (see http://cgit.freedesktop.org/mesa/glu/tree/src/libtess/tess.c#n180)
          this.gluTessEndPolygon();
          break;
      }
    }
  }
};


/**
 * [addVertex_ description]
 * @private
 * @param {Array.<number>} coords [description].
 * @param {Object} data [description].
 */
libtess.GluTesselator.prototype.addVertex_ = function(coords, data) {
  var e = this.lastEdge_;
  if (e === null) {
    // Make a self-loop (one vertex, one edge).
    e = libtess.mesh.makeEdge(this.mesh);
    libtess.mesh.meshSplice(e, e.sym);

  } else {
    // Create a new vertex and edge which immediately follow e
    // in the ordering around the left face.
    libtess.mesh.splitEdge(e);
    e = e.lNext;
  }

  // The new vertex is now e.org.
  e.org.data = data;
  e.org.coords[0] = coords[0];
  e.org.coords[1] = coords[1];
  e.org.coords[2] = coords[2];

  // The winding of an edge says how the winding number changes as we
  // cross from the edge''s right face to its left face.  We add the
  // vertices in such an order that a CCW contour will add +1 to
  // the winding number of the region inside the contour.
  e.winding = 1;
  e.sym.winding = -1;

  this.lastEdge_ = e;
};

/**
 * Call callback to indicate the start of a primitive, to be followed by emitted
 * vertices, if any. In libtess.js, `type` will always be `GL_TRIANGLES`.
 * @param {libtess.primitiveType} type
 */
libtess.GluTesselator.prototype.callBeginCallback = function(type) {
  if (this.beginCallback_) {
    this.beginCallback_(type, this.polygonData_);
  }
};

/**
 * Call callback to emit the vertices of the tessellated polygon.
 * @param {Object} data
 */
libtess.GluTesselator.prototype.callVertexCallback = function(data) {
  if (this.vertexCallback_) {
    this.vertexCallback_(data, this.polygonData_);
  }
};

/**
 * Call callback to indicate whether the vertices to follow begin edges which
 * lie on a polygon boundary.
 * @param {boolean} flag
 */
libtess.GluTesselator.prototype.callEdgeFlagCallback = function(flag) {
  if (this.edgeFlagCallback_) {
    this.edgeFlagCallback_(flag, this.polygonData_);
  }
};

/**
 * Call callback to indicate the end of tessellation.
 */
libtess.GluTesselator.prototype.callEndCallback = function() {
  if (this.endCallback_) {
    this.endCallback_(this.polygonData_);
  }
};

/* jscs:disable maximumLineLength */
/**
 * Call callback for combining vertices at edge intersection requiring the
 * creation of a new vertex.
 * @param {!Array<number>} coords Intersection coordinates.
 * @param {!Array<Object>} data Array of vertex data, one per edge vertices.
 * @param {!Array<number>} weight Coefficients used for the linear combination of vertex coordinates that gives coords.
 * @return {?Object} Interpolated vertex.
 */
libtess.GluTesselator.prototype.callCombineCallback = function(coords, data, weight) {
  if (this.combineCallback_) {
    return this.combineCallback_(coords, data, weight, this.polygonData_) ||
        null;
  }

  return null;
};
/* jscs:enable maximumLineLength */

/**
 * Call error callback, if specified, with errno.
 * @param {(libtess.errorType|libtess.gluEnum)} errno
 */
libtess.GluTesselator.prototype.callErrorCallback = function(errno) {
  if (this.errorCallback_) {
    this.errorCallback_(errno, this.polygonData_);
  }
};

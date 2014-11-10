/**
 * Copyright 2000, Silicon Graphics, Inc. All Rights Reserved.
 * Copyright 2012, Google Inc. All Rights Reserved.
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

// require libtess
// require libtess.CachedVertex
// require libtess.GluTesselator
// require libtess.GluFace
// require libtess.GluHalfEdge
// require libtess.GluMesh
/*global libtess */

// TODO(bckenny): most of these doc strings are probably more internal comments

libtess.render = function() {

};


/**
 * [SIGN_INCONSISTENT_ description]
 * @type {number}
 * @private
 * @const
 */
libtess.render.SIGN_INCONSISTENT_ = 2;


/**
 * render.renderMesh(tess, mesh) takes a mesh and breaks it into triangle
 * fans, strips, and separate triangles. A substantial effort is made
 * to use as few rendering primitives as possible (i.e. to make the fans
 * and strips as large as possible).
 *
 * The rendering output is provided as callbacks (see the api).
 *
 * @param {libtess.GluTesselator} tess [description].
 * @param {libtess.GluMesh} mesh [description].
 */
libtess.render.renderMesh = function(tess, mesh) {
  // Make a list of separate triangles so we can render them all at once
  tess.lonelyTriList = null;

  var f;
  for (f = mesh.fHead.next; f !== mesh.fHead; f = f.next) {
    f.marked = false;
  }
  for (f = mesh.fHead.next; f !== mesh.fHead; f = f.next) {
    // We examine all faces in an arbitrary order.  Whenever we find
    // an unprocessed face F, we output a group of faces including F
    // whose size is maximum.
    if (f.inside && !f.marked) {
      libtess.render.renderMaximumFaceGroup_(tess, f);
      libtess.assert(f.marked);
    }
  }
  if (tess.lonelyTriList !== null) {
    libtess.render.renderLonelyTriangles_(tess, tess.lonelyTriList);
    tess.lonelyTriList = null;
  }
};


/**
 * render.renderBoundary(tess, mesh) takes a mesh, and outputs one
 * contour for each face marked "inside". The rendering output is
 * provided as callbacks (see the api).
 *
 * @param {libtess.GluTesselator} tess [description].
 * @param {libtess.GluMesh} mesh [description].
 */
libtess.render.renderBoundary = function(tess, mesh) {
  for (var f = mesh.fHead.next; f !== mesh.fHead; f = f.next) {
    if (f.inside) {
      tess.callBeginOrBeginData(libtess.primitiveType.GL_LINE_LOOP);

      var e = f.anEdge;
      do {
        tess.callVertexOrVertexData(e.org.data);
        e = e.lNext;
      } while (e !== f.anEdge);

      tess.callEndOrEndData();
    }
  }
};


/**
 * render.renderCache(tess) takes a single contour and tries to render it
 * as a triangle fan. This handles convex polygons, as well as some
 * non-convex polygons if we get lucky.
 *
 * Returns true if the polygon was successfully rendered. The rendering
 * output is provided as callbacks (see the api).
 *
 * @param {libtess.GluTesselator} tess [description].
 * @return {boolean} [description].
 */
libtess.render.renderCache = function(tess) {
  if (tess.cacheCount < 3) {
    // degenerate contour -- no output
    return true;
  }

  // TODO(bckenny): better init?
  var norm = [0, 0, 0];
  norm[0] = tess.normal[0];
  norm[1] = tess.normal[1];
  norm[2] = tess.normal[2];
  if (norm[0] === 0 && norm[1] === 0 && norm[2] === 0) {
    libtess.render.computeNormal_(tess, norm, false);
  }

  var sign = libtess.render.computeNormal_(tess, norm, true);
  if (sign === libtess.render.SIGN_INCONSISTENT_) {
    // fan triangles did not have a consistent orientation
    return false;
  }
  if (sign === 0) {
    // all triangles were degenerate
    return true;
  }

  // make sure we do the right thing for each winding rule
  switch (tess.windingRule) {
    case libtess.windingRule.GLU_TESS_WINDING_ODD:
    case libtess.windingRule.GLU_TESS_WINDING_NONZERO:
      break;
    case libtess.windingRule.GLU_TESS_WINDING_POSITIVE:
      if (sign < 0) {
        return true;
      }
      break;
    case libtess.windingRule.GLU_TESS_WINDING_NEGATIVE:
      if (sign > 0) {
        return true;
      }
      break;
    case libtess.windingRule.GLU_TESS_WINDING_ABS_GEQ_TWO:
      return true;
  }

  tess.callBeginOrBeginData(tess.boundaryOnly ?
      libtess.primitiveType.GL_LINE_LOOP : (tess.cacheCount > 3) ?
      libtess.primitiveType.GL_TRIANGLE_FAN :
      libtess.primitiveType.GL_TRIANGLES);

  // indexes into tess.cache to replace pointers
  // TODO(bckenny): refactor to be more straightforward
  var v0 = 0;
  var vn = v0 + tess.cacheCount;
  var vc;

  tess.callVertexOrVertexData(tess.cache[v0].data);
  if (sign > 0) {
    for (vc = v0 + 1; vc < vn; ++vc) {
      tess.callVertexOrVertexData(tess.cache[vc].data);
    }
  } else {
    for (vc = vn - 1; vc > v0; --vc) {
      tess.callVertexOrVertexData(tess.cache[vc].data);
    }
  }
  tess.callEndOrEndData();
  return true;
};


/**
 * Just add the triangle to a triangle list, so we can render all
 * the separate triangles at once.
 * @private
 * @param {libtess.GluTesselator} tess [description].
 * @param {libtess.GluHalfEdge} e [description].
 * @param {number} size [description].
 */
libtess.render.renderTriangle_ = function(tess, e, size) {
  libtess.assert(size === 1);
  // NOTE(bckenny): AddToTrail(e.lFace, tess.lonelyTriList) macro
  e.lFace.trail = tess.lonelyTriList;
  tess.lonelyTriList = e.lFace;
  e.lFace.marked = true;
};


/**
 * We want to find the largest triangle fan or strip of unmarked faces
 * which includes the given face fOrig. There are 3 possible fans
 * passing through fOrig (one centered at each vertex), and 3 possible
 * strips (one for each CCW permutation of the vertices). Our strategy
 * is to try all of these, and take the primitive which uses the most
 * triangles (a greedy approach).
 * @private
 * @param {libtess.GluTesselator} tess [description].
 * @param {libtess.GluFace} fOrig [description].
 */
libtess.render.renderMaximumFaceGroup_ = function(tess, fOrig) {
  var e = fOrig.anEdge;
  var max = new libtess.FaceCount(1, e, libtess.render.renderTriangle_);
  max.render(tess, max.eStart, max.size);
};


/**
 * Now we render all the separate triangles which could not be
 * grouped into a triangle fan or strip.
 * @private
 * @param {libtess.GluTesselator} tess [description].
 * @param {libtess.GluFace} head [description].
 */
libtess.render.renderLonelyTriangles_ = function(tess, head) {
  // TODO(bckenny): edgeState needs to be boolean, but != on first call
  // force edge state output for first vertex
  var edgeState = -1;

  var f = head;

  tess.callBeginOrBeginData(libtess.primitiveType.GL_TRIANGLES);

  for (; f !== null; f = f.trail) {
    // Loop once for each edge (there will always be 3 edges)
    var e = f.anEdge;
    do {
      if (tess.flagBoundary) {
        // Set the "edge state" to true just before we output the
        // first vertex of each edge on the polygon boundary.
        var newState = !e.rFace().inside ? 1 : 0; // TODO(bckenny): total hack to get edgeState working. fix me.
        if (edgeState !== newState) {
          edgeState = newState;
          // TODO(bckenny): edgeState should be boolean now
          tess.callEdgeFlagOrEdgeFlagData(!!edgeState);
        }
      }
      tess.callVertexOrVertexData(e.org.data);

      e = e.lNext;
    } while (e !== f.anEdge);
  }

  tess.callEndOrEndData();
};


/**
 * If check==false, we compute the polygon normal and place it in norm[].
 * If check==true, we check that each triangle in the fan from v0 has a
 * consistent orientation with respect to norm[]. If triangles are
 * consistently oriented CCW, return 1; if CW, return -1; if all triangles
 * are degenerate return 0; otherwise (no consistent orientation) return
 * render.SIGN_INCONSISTENT_.
 * @private
 * @param {libtess.GluTesselator} tess [description].
 * @param {Array.<number>} norm [description].
 * @param {boolean} check [description].
 * @return {number} int.
 */
libtess.render.computeNormal_ = function(tess, norm, check) {
  /* Find the polygon normal. It is important to get a reasonable
   * normal even when the polygon is self-intersecting (eg. a bowtie).
   * Otherwise, the computed normal could be very tiny, but perpendicular
   * to the true plane of the polygon due to numerical noise. Then all
   * the triangles would appear to be degenerate and we would incorrectly
   * decompose the polygon as a fan (or simply not render it at all).
   *
   * We use a sum-of-triangles normal algorithm rather than the more
   * efficient sum-of-trapezoids method (used in checkOrientation()
   * in normal.js). This lets us explicitly reverse the signed area
   * of some triangles to get a reasonable normal in the self-intersecting
   * case.
   */
  if (!check) {
    norm[0] = norm[1] = norm[2] = 0;
  }

  // indexes into tess.cache to replace pointers
  // TODO(bckenny): refactor to be more straightforward
  var v0 = 0;
  var vn = v0 + tess.cacheCount;
  var vc = v0 + 1;
  var vert0 = tess.cache[v0];
  var vertc = tess.cache[vc];

  var xc = vertc.coords[0] - vert0.coords[0];
  var yc = vertc.coords[1] - vert0.coords[1];
  var zc = vertc.coords[2] - vert0.coords[2];

  var sign = 0;
  while (++vc < vn) {
    vertc = tess.cache[vc];
    var xp = xc;
    var yp = yc;
    var zp = zc;
    xc = vertc.coords[0] - vert0.coords[0];
    yc = vertc.coords[1] - vert0.coords[1];
    zc = vertc.coords[2] - vert0.coords[2];

    // Compute (vp - v0) cross (vc - v0)
    var n = [0, 0, 0]; // TODO(bckenny): better init?
    n[0] = yp * zc - zp * yc;
    n[1] = zp * xc - xp * zc;
    n[2] = xp * yc - yp * xc;

    var dot = n[0] * norm[0] + n[1] * norm[1] + n[2] * norm[2];
    if (!check) {
      // Reverse the contribution of back-facing triangles to get
      // a reasonable normal for self-intersecting polygons (see above)
      if (dot >= 0) {
        norm[0] += n[0];
        norm[1] += n[1];
        norm[2] += n[2];
      } else {
        norm[0] -= n[0];
        norm[1] -= n[1];
        norm[2] -= n[2];
      }
    } else if (dot !== 0) {
      // Check the new orientation for consistency with previous triangles
      if (dot > 0) {
        if (sign < 0) {
          return libtess.render.SIGN_INCONSISTENT_;
        }
        sign = 1;
      } else {
        if (sign > 0) {
          return libtess.render.SIGN_INCONSISTENT_;
        }
        sign = -1;
      }
    }
  }

  return sign;
};

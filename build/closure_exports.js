/*
 * Copyright 2014 Google Inc.
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

/* global libtess, module */

/**
 * @fileoverview Closure compiler exports for libtess.
 * NOTE(bckenny): add to this to work cross-platform. Unfortunately seems to
 * require supressing the globalThis error.
 * @suppress {globalThis}
 */

this['libtess'] = {
  'GluTesselator': libtess.GluTesselator,

  // enums
  'windingRule': {
    'GLU_TESS_WINDING_ODD': libtess.windingRule.GLU_TESS_WINDING_ODD,
    'GLU_TESS_WINDING_NONZERO': libtess.windingRule.GLU_TESS_WINDING_NONZERO,
    'GLU_TESS_WINDING_POSITIVE': libtess.windingRule.GLU_TESS_WINDING_POSITIVE,
    'GLU_TESS_WINDING_NEGATIVE': libtess.windingRule.GLU_TESS_WINDING_NEGATIVE,
    'GLU_TESS_WINDING_ABS_GEQ_TWO':
        libtess.windingRule.GLU_TESS_WINDING_ABS_GEQ_TWO
  },
  'primitiveType': {
    'GL_LINE_LOOP': libtess.primitiveType.GL_LINE_LOOP,
    'GL_TRIANGLES': libtess.primitiveType.GL_TRIANGLES,
    'GL_TRIANGLE_STRIP': libtess.primitiveType.GL_TRIANGLE_STRIP,
    'GL_TRIANGLE_FAN': libtess.primitiveType.GL_TRIANGLE_FAN
  },
  'errorType': {
    'GLU_TESS_MISSING_BEGIN_POLYGON':
        libtess.errorType.GLU_TESS_MISSING_BEGIN_POLYGON,
    'GLU_TESS_MISSING_END_POLYGON':
        libtess.errorType.GLU_TESS_MISSING_END_POLYGON,
    'GLU_TESS_MISSING_BEGIN_CONTOUR':
        libtess.errorType.GLU_TESS_MISSING_BEGIN_CONTOUR,
    'GLU_TESS_MISSING_END_CONTOUR':
      libtess.errorType.GLU_TESS_MISSING_END_CONTOUR,
    'GLU_TESS_COORD_TOO_LARGE':
        libtess.errorType.GLU_TESS_COORD_TOO_LARGE,
    'GLU_TESS_NEED_COMBINE_CALLBACK':
        libtess.errorType.GLU_TESS_NEED_COMBINE_CALLBACK
  },
  'gluEnum': {
    'GLU_TESS_MESH': libtess.gluEnum.GLU_TESS_MESH,
    'GLU_TESS_TOLERANCE': libtess.gluEnum.GLU_TESS_TOLERANCE,
    'GLU_TESS_WINDING_RULE': libtess.gluEnum.GLU_TESS_WINDING_RULE,
    'GLU_TESS_BOUNDARY_ONLY': libtess.gluEnum.GLU_TESS_BOUNDARY_ONLY,
    'GLU_INVALID_ENUM': libtess.gluEnum.GLU_INVALID_ENUM,
    'GLU_INVALID_VALUE': libtess.gluEnum.GLU_INVALID_VALUE,
    'GLU_TESS_BEGIN': libtess.gluEnum.GLU_TESS_BEGIN,
    'GLU_TESS_VERTEX': libtess.gluEnum.GLU_TESS_VERTEX,
    'GLU_TESS_END': libtess.gluEnum.GLU_TESS_END,
    'GLU_TESS_ERROR': libtess.gluEnum.GLU_TESS_ERROR,
    'GLU_TESS_EDGE_FLAG': libtess.gluEnum.GLU_TESS_EDGE_FLAG,
    'GLU_TESS_COMBINE': libtess.gluEnum.GLU_TESS_COMBINE,
    'GLU_TESS_BEGIN_DATA': libtess.gluEnum.GLU_TESS_BEGIN_DATA,
    'GLU_TESS_VERTEX_DATA': libtess.gluEnum.GLU_TESS_VERTEX_DATA,
    'GLU_TESS_END_DATA': libtess.gluEnum.GLU_TESS_END_DATA,
    'GLU_TESS_ERROR_DATA': libtess.gluEnum.GLU_TESS_ERROR_DATA,
    'GLU_TESS_EDGE_FLAG_DATA': libtess.gluEnum.GLU_TESS_EDGE_FLAG_DATA,
    'GLU_TESS_COMBINE_DATA': libtess.gluEnum.GLU_TESS_COMBINE_DATA
  }
};

libtess.GluTesselator.prototype['gluDeleteTess'] =
    libtess.GluTesselator.prototype.gluDeleteTess;
libtess.GluTesselator.prototype['gluTessProperty'] =
    libtess.GluTesselator.prototype.gluTessProperty;
libtess.GluTesselator.prototype['gluGetTessProperty'] =
    libtess.GluTesselator.prototype.gluGetTessProperty;
libtess.GluTesselator.prototype['gluTessNormal'] =
    libtess.GluTesselator.prototype.gluTessNormal;
libtess.GluTesselator.prototype['gluTessCallback'] =
    libtess.GluTesselator.prototype.gluTessCallback;
libtess.GluTesselator.prototype['gluTessVertex'] =
    libtess.GluTesselator.prototype.gluTessVertex;
libtess.GluTesselator.prototype['gluTessBeginPolygon'] =
    libtess.GluTesselator.prototype.gluTessBeginPolygon;
libtess.GluTesselator.prototype['gluTessBeginContour'] =
    libtess.GluTesselator.prototype.gluTessBeginContour;
libtess.GluTesselator.prototype['gluTessEndContour'] =
    libtess.GluTesselator.prototype.gluTessEndContour;
libtess.GluTesselator.prototype['gluTessEndPolygon'] =
    libtess.GluTesselator.prototype.gluTessEndPolygon;

# libtess.js

[![Build Status](https://img.shields.io/travis/brendankenny/libtess.js/gh-pages.svg?style=flat-square)](https://travis-ci.org/brendankenny/libtess.js) [![Coverage Status](https://img.shields.io/coveralls/brendankenny/libtess.js/gh-pages.svg?style=flat-square)](https://coveralls.io/r/brendankenny/libtess.js?branch=gh-pages)

Polygon tesselation library, ported from the tesselator in Silicon Graphics's
[reference implementation](http://oss.sgi.com/projects/ogl-sample/index.html) of
the OpenGL Utility Library (GLU), written primarily by
[Eric Veach](https://www.youtube.com/watch?v=e3ss_Ozb9Yg) while at SGI.

## Installation

```
npm install libtess
```

## Example
See the [example page](https://brendankenny.github.io/libtess.js/examples/simple_triangulation/index.html)
for a simple example of setting up a polygon with a hole made of two contours,
triangulating it, and then drawing it with WebGL.

## Tests
Run the tests locally with `npm test`, or in the browser [here](https://brendankenny.github.io/libtess.js/test/index.html).

See the [expectations viewer](https://brendankenny.github.io/libtess.js/test/browser/expectations-viewer.html)
to compare the test geometry tessellated with the latest version of the library
versus the expected (baseline) tessellation.

## Tesselator or Tessellator?

Probably tessellator, but `GLUtesselator`, etc is in the original GLU API handed
down from Ancient Times and "tesselator" is already all over the original source
code, so that's what we're going with.

## License

Licensed under the
[SGI Free Software License B v2.0](https://github.com/brendankenny/libtess.js/blob/gh-pages/LICENSE).

This SGI license is not a common one, but the
[FSF has helped](https://www.fsf.org/blogs/licensing/2008-09-sgi-announcement)
bring it into equivalence with modern free software licenses, with terms
identical to that of the X11 License (MIT + "no-endorsement" clause). More
guidance [here](https://www.gnu.org/licenses/license-list.html#SGIFreeB).

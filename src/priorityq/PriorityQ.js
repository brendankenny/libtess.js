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

/**
 * A priority queue of vertices, ordered by libtess.geom.vertLeq, implemented
 * with a sorted array. Used for initial insertion of vertices (see
 * libtess.sweep.initPriorityQ_), sorted once, then it uses an internal
 * libtess.PriorityQHeap for any subsequently created vertices from
 * intersections.
 * @constructor
 * @struct
 */
libtess.PriorityQ = function() {
  /**
   * An unordered list of vertices that have been inserted in the queue, with
   * null in empty slots.
   * @private {Array<libtess.GluVertex>}
   */
  this.verts_ = [];

  /**
   * Array of indices into this.verts_, sorted by vertLeq over the addressed
   * vertices.
   * @private {Array<number>}
   */
  this.order_ = null;

  /**
   * The size of this queue, not counting any vertices stored in heap_.
   * @private {number}
   */
  this.size_ = 0;

  /**
   * Indicates that the queue has been initialized via init. If false, inserts
   * are fast insertions at the end of the verts_ array. If true, the verts_
   * array is sorted and subsequent inserts are done in the heap.
   * @private {boolean}
   */
  this.initialized_ = false;

  /**
   * A priority queue heap, used for faster insertions of vertices after verts_
   * has been sorted.
   * @private {libtess.PriorityQHeap}
   */
  this.heap_ = new libtess.PriorityQHeap();
};

/**
 * Release major storage memory used by priority queue.
 */
libtess.PriorityQ.prototype.deleteQ = function() {
  // TODO(bckenny): could instead clear most of these.
  this.heap_ = null;
  this.order_ = null;
  this.verts_ = null;
  // NOTE(bckenny): nulled at callsite (sweep.donePriorityQ_)
};

/**
 * Sort vertices by libtess.geom.vertLeq. Must be called before any method other
 * than insert is called to ensure correctness when removing or querying.
 */
libtess.PriorityQ.prototype.init = function() {
  // TODO(bckenny): reuse. in theory, we don't have to empty this, as access is
  // dictated by this.size_, but array.sort doesn't know that
  this.order_ = [];

  // Create an array of indirect pointers to the verts, so that
  // the handles we have returned are still valid.
  // TODO(bckenny): valid for when? it appears we can just store indexes into
  // verts_, but what did this mean?
  for (var i = 0; i < this.size_; i++) {
    this.order_[i] = i;
  }

  // sort the indirect pointers in descending order of the verts themselves
  // TODO(bckenny): make sure it's ok that verts[a] === verts[b] returns 1
  // TODO(bckenny): unstable sort means we may get slightly different polys in
  // different browsers, but only when passing in equal points
  // TODO(bckenny): make less awkward closure?
  var comparator = (function(verts) {
    return function(a, b) {
      return libtess.geom.vertLeq(verts[a], verts[b]) ? 1 : -1;
    };
  })(this.verts_);
  this.order_.sort(comparator);

  this.initialized_ = true;
  this.heap_.init();

  // NOTE(bckenny): debug assert of ordering of the verts_ array.
  if (libtess.DEBUG) {
    var p = 0;
    var r = p + this.size_ - 1;
    for (i = p; i < r; ++i) {
      libtess.assert(libtess.geom.vertLeq(this.verts_[this.order_[i + 1]],
          this.verts_[this.order_[i]]));
    }
  }
};

/**
 * Insert a vertex into the priority queue. Returns a PQHandle to refer to it,
 * which will never be 0.
 * @param {libtess.GluVertex} vert
 * @return {libtess.PQHandle}
 */
libtess.PriorityQ.prototype.insert = function(vert) {
  // NOTE(bckenny): originally returned LONG_MAX as alloc failure signal. no
  // longer does.
  if (this.initialized_) {
    return this.heap_.insert(vert);
  }

  var curr = this.size_++;

  this.verts_[curr] = vert;

  // Negative handles index the sorted array.
  return -(curr + 1);
};

/**
 * Removes the minimum vertex from the queue and returns it. If the queue is
 * empty, null will be returned.
 * @return {libtess.GluVertex}
 */
libtess.PriorityQ.prototype.extractMin = function() {
  if (this.size_ === 0) {
    return this.heap_.extractMin();
  }

  var sortMin = this.verts_[this.order_[this.size_ - 1]];
  if (!this.heap_.isEmpty()) {
    var heapMin = this.heap_.minimum();
    if (libtess.geom.vertLeq(heapMin, sortMin)) {
      return this.heap_.extractMin();
    }
  }

  do {
    --this.size_;
  } while (this.size_ > 0 && this.verts_[this.order_[this.size_ - 1]] === null);

  return sortMin;
};

/**
 * Returns the minimum vertex in the queue. If the queue is empty, null will be
 * returned.
 * @return {libtess.GluVertex}
 */
libtess.PriorityQ.prototype.minimum = function() {
  if (this.size_ === 0) {
    return this.heap_.minimum();
  }

  var sortMin = this.verts_[this.order_[this.size_ - 1]];
  if (!this.heap_.isEmpty()) {
    var heapMin = this.heap_.minimum();
    if (libtess.geom.vertLeq(heapMin, sortMin)) {
      return heapMin;
    }
  }

  return sortMin;
};

/**
 * Remove vertex with handle removeHandle from queue.
 * @param {libtess.PQHandle} removeHandle
 */
libtess.PriorityQ.prototype.remove = function(removeHandle) {
  if (removeHandle >= 0) {
    this.heap_.remove(removeHandle);
    return;
  }
  removeHandle = -(removeHandle + 1);

  libtess.assert(removeHandle < this.verts_.length &&
      this.verts_[removeHandle] !== null);

  this.verts_[removeHandle] = null;
  while (this.size_ > 0 && this.verts_[this.order_[this.size_ - 1]] === null) {
    --this.size_;
  }
};

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

// TODO(bckenny): preallocating arrays may actually be hurting us in sort
// performance (esp if theres some undefs in there)

/**
 * [PriorityQ description]
 * @constructor
 * @struct
 * @param {function(libtess.GluVertex, libtess.GluVertex): boolean} leq
 */
libtess.PriorityQ = function(leq) {
  /**
   * [keys description]
   * @private {Array<libtess.GluVertex>}
   */
  this.keys_ = libtess.PriorityQ.prototype.PQKeyRealloc_(null,
      libtess.PriorityQ.INIT_SIZE_);

  /**
   * Array of indexes into this.keys_
   * @private {Array<number>}
   */
  this.order_ = null;

  /**
   * [size description]
   * @private {number}
   */
  this.size_ = 0;

  /**
   * [max_ description]
   * @private {number}
   */
  this.max_ = libtess.PriorityQ.INIT_SIZE_;

  /**
   * [initialized description]
   * @private {boolean}
   */
  this.initialized_ = false;

  // TODO(bckenny): leq was inlined by define in original, but appears to just
  // be vertLeq, as passed. keep an eye on this as to why its not used.
  /**
   * [leq description]
   * @private {function(libtess.GluVertex, libtess.GluVertex): boolean}
   */
  this.leq_ = leq;

  /**
   * [heap_ description]
   * @private {libtess.PriorityQHeap}
   */
  this.heap_ = new libtess.PriorityQHeap();
};

/**
 * [INIT_SIZE_ description]
 * @private
 * @const
 * @type {number}
 */
libtess.PriorityQ.INIT_SIZE_ = 32;

/**
 * [deleteQ description]
 */
libtess.PriorityQ.prototype.deleteQ = function() {
  this.heap_ = null;
  this.order_ = null;
  this.keys_ = null;
  // NOTE(bckenny): nulled at callsite (sweep.donePriorityQ_)
};

/**
 * [init description]
 */
libtess.PriorityQ.prototype.init = function() {
  // TODO(bckenny): reuse. in theory, we don't have to empty this, as access is
  // dictated by this.size_, but array.sort doesn't know that
  this.order_ = [];

  // Create an array of indirect pointers to the keys, so that
  // the handles we have returned are still valid.
  // TODO(bckenny): valid for when? it appears we can just store indexes into
  // keys_, but what did this mean?
  for (var i = 0; i < this.size_; i++) {
    this.order_[i] = i;
  }

  // sort the indirect pointers in descending order of the keys themselves
  // TODO(bckenny): make sure it's ok that keys[a] === keys[b] returns 1
  // TODO(bckenny): unstable sort means we may get slightly different polys in
  // different browsers, but only when passing in equal points
  // TODO(bckenny): make less awkward closure?
  var comparator = (function(keys, leq) {
    return function(a, b) {
      return leq(keys[a], keys[b]) ? 1 : -1;
    };
  })(this.keys_, this.leq_);
  this.order_.sort(comparator);

  this.max_ = this.size_;
  this.initialized_ = true;
  this.heap_.init();

  // TODO(bckenny):
  // #ifndef NDEBUG
  if (libtess.DEBUG) {
    var p = 0;
    var r = p + this.size_ - 1;
    for (i = p; i < r; ++i) {
      libtess.assert(this.leq_(this.keys_[this.order_[i + 1]],
          this.keys_[this.order_[i]]));
    }
  }
  // #endif
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

  var curr = this.size_;
  if (++this.size_ >= this.max_) {
    // If the heap overflows, double its size.
    this.max_ *= 2;
    this.keys_ =
        libtess.PriorityQ.prototype.PQKeyRealloc_(this.keys_, this.max_);
  }

  this.keys_[curr] = vert;

  // Negative handles index the sorted array.
  return -(curr + 1);
};

/**
 * Allocate an array of size size. If oldArray is not null, its contents are
 * copied to the beginning of the new array. The rest of the array is filled
 * with nulls.
 * @private
 * @param {?Array<libtess.GluVertex>} oldArray
 * @param {number} size
 * @return {!Array<(libtess.GluVertex)>}
 */
libtess.PriorityQ.prototype.PQKeyRealloc_ = function(oldArray, size) {
  // TODO(bckenny): double check return type. can we have ? there?
  var newArray = new Array(size);

  // TODO(bckenny): better to reallocate array? or grow array?
  var index = 0;
  if (oldArray !== null) {
    for (; index < oldArray.length; index++) {
      newArray[index] = oldArray[index];
    }
  }

  for (; index < size; index++) {
    newArray[index] = null;
  }

  return newArray;
};

// NOTE(bckenny): libtess.PriorityQ.keyLessThan_ is called nowhere in libtess
// and isn't part of the public API.
/* istanbul ignore next */
/**
 * Whether x is less than y according to this.leq_.
 * @private
 * @param {number} x
 * @param {number} y
 * @return {boolean}
 */
libtess.PriorityQ.prototype.keyLessThan_ = function(x, y) {
  // NOTE(bckenny): was macro LT
  var keyX = this.keys_[x];
  var keyY = this.keys_[y];
  return !this.leq_(keyY, keyX);
};

// NOTE(bckenny): libtess.PriorityQ.keyGreaterThan_ is called nowhere in libtess
// and isn't part of the public API.
/* istanbul ignore next */
/**
 * Whether x is greater than y according to this.leq_.
 * @private
 * @param {number} x
 * @param {number} y
 * @return {boolean}
 */
libtess.PriorityQ.prototype.keyGreaterThan_ = function(x, y) {
  // NOTE(bckenny): was macro GT
  var keyX = this.keys_[x];
  var keyY = this.keys_[y];
  return !this.leq_(keyX, keyY);
};

/**
 * [extractMin description]
 * @return {libtess.GluVertex} [description].
 */
libtess.PriorityQ.prototype.extractMin = function() {
  if (this.size_ === 0) {
    return this.heap_.extractMin();
  }

  var sortMin = this.keys_[this.order_[this.size_ - 1]];
  if (!this.heap_.isEmpty()) {
    var heapMin = this.heap_.minimum();
    if (this.leq_(heapMin, sortMin)) {
      return this.heap_.extractMin();
    }
  }

  do {
    --this.size_;
  } while (this.size_ > 0 && this.keys_[this.order_[this.size_ - 1]] === null);

  return sortMin;
};

/**
 * [minimum description]
 * @return {libtess.GluVertex} [description].
 */
libtess.PriorityQ.prototype.minimum = function() {
  if (this.size_ === 0) {
    return this.heap_.minimum();
  }

  var sortMin = this.keys_[this.order_[this.size_ - 1]];
  if (!this.heap_.isEmpty()) {
    var heapMin = this.heap_.minimum();
    if (this.leq_(heapMin, sortMin)) {
      return heapMin;
    }
  }

  return sortMin;
};

// NOTE(bckenny): libtess.PriorityQ.isEmpty_ isn't called within libtess and
// isn't part of the public API. For now, leaving in but ignoring for coverage.
/* istanbul ignore next */
/**
 * Returns whether the priority queue is empty.
 * @private
 * @return {boolean}
 */
libtess.PriorityQ.prototype.isEmpty_ = function() {
  return (this.size_ === 0) && this.heap_.isEmpty();
};

/**
 * [remove description]
 * @param {libtess.PQHandle} curr [description].
 */
libtess.PriorityQ.prototype.remove = function(curr) {
  if (curr >= 0) {
    this.heap_.remove(curr);
    return;
  }
  curr = -(curr + 1);

  libtess.assert(curr < this.max_ && this.keys_[curr] !== null);

  this.keys_[curr] = null;
  while (this.size_ > 0 && this.keys_[this.order_[this.size_ - 1]] === null) {
    --this.size_;
  }
};

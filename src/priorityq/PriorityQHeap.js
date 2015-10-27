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

// TODO(bckenny): keys appear to always be GluVertex in this case?

/**
 * A priority queue of vertices, ordered by libtess.geom.vertLeq, implemented
 * with a binary heap. Used only within libtess.PriorityQ.
 * @constructor
 * @struct
 * @param {function(libtess.PQKey, libtess.PQKey): boolean} leq [description].
 */
libtess.PriorityQHeap = function(leq) {
  /**
   * The heap itself. Active nodes are stored in the range 1..size. Each node
   * stores only an index into handles.
   * @private
   * @type {!Array<number>}
   */
  this.nodes_ = libtess.PriorityQHeap.reallocNodes_([0],
      libtess.PriorityQHeap.INIT_SIZE_ + 1);

  /**
   * Each handle stores a key, plus a pointer back to the node which currently
   * represents that key (ie. nodes_[handles[i].node] == i).
   * @private
   * @type {!Array.<libtess.PQHandleElem>}
   */
  this.handles_ = libtess.PQHandleElem.realloc(null,
      libtess.PriorityQHeap.INIT_SIZE_ + 1);

  /**
   * The size of the queue.
   * @private
   * @type {number}
   */
  this.size_ = 0;

  /**
   * The queue's current allocated space.
   * @private
   * @type {number}
   */
  this.max_ = libtess.PriorityQHeap.INIT_SIZE_;

  /**
   * The index of the next free hole in the handles array. Handle in that slot
   * has next item in freeList in its node propert. If there are no holes,
   * freeList === 0 and one at the end of handles must be use.
   * @private
   * @type {libtess.PQHandle}
   */
  this.freeList_ = 0;

  /**
   * Indicates that the heap has been initialized via init. If false, inserts
   * are fast insertions at the end of a list. If true, all inserts will now be
   * correctly ordered in the queue before returning.
   * @private
   * @type {boolean}
   */
  this.initialized_ = false;

  // TODO(bckenny): leq was inlined by define in original, but appears to
  // be vertLeq, as passed. Using injected version, but is it better just to
  // manually inline?
  /**
   * [leq description]
   * @private
   * @type {function(libtess.PQKey, libtess.PQKey): boolean}
   */
  this.leq_ = leq;

  // so that minimum returns null
  this.nodes_[1] = 1;
};

/**
 * [INIT_SIZE_ description]
 * @private
 * @const
 * @type {number}
 */
libtess.PriorityQHeap.INIT_SIZE_ = 32;

/**
 * Allocate a node index array of size size. If oldArray is not null, its
 * contents are copied to the beginning of the new array. The rest of the array
 * is filled with new node indices.
 * @private
 * @param {!Array<number>} oldArray
 * @param {number} size
 * @return {!Array<number>}
 */
libtess.PriorityQHeap.reallocNodes_ = function(oldArray, size) {
  var newArray = new Array(size);

  // TODO(bckenny): V8 likes this significantly more than simply growing the
  // array element-by-element, so, for now, emulating realloc.
  for (var index = 0; index < oldArray.length; index++) {
    newArray[index] = oldArray[index];
  }

  for (; index < size; index++) {
    newArray[index] = 0;
  }

  return newArray;
};

/**
 * Initializing ordering of the heap. Must be called before any method other
 * than insert is called to ensure correctness when removing or querying.
 */
libtess.PriorityQHeap.prototype.init = function() {
  // This method of building a heap is O(n), rather than O(n lg n).
  for (var i = this.size_; i >= 1; --i) {
    this.floatDown_(i);
  }

  this.initialized_ = true;
};

/**
 * Insert a new key into the heap.
 * @param {libtess.PQKey} keyNew The key to insert.
 * @return {libtess.PQHandle} A handle that can be used to remove the key.
 */
libtess.PriorityQHeap.prototype.insert = function(keyNew) {
  var curr = ++this.size_;

  // if the heap overflows, double its size.
  if ((curr * 2) > this.max_) {
    this.max_ *= 2;
    this.nodes_ = libtess.PriorityQHeap.reallocNodes_(this.nodes_,
        this.max_ + 1);
    this.handles_ = libtess.PQHandleElem.realloc(this.handles_, this.max_ + 1);
  }

  var free;
  if (this.freeList_ === 0) {
    free = curr;
  } else {
    free = this.freeList_;
    this.freeList_ = this.handles_[free].node;
  }

  this.nodes_[curr] = free;
  this.handles_[free].node = curr;
  this.handles_[free].key = keyNew;

  if (this.initialized_) {
    this.floatUp_(curr);
  }

  return free;
};

/**
 * @return {boolean} Whether the heap is empty.
 */
libtess.PriorityQHeap.prototype.isEmpty = function() {
  return this.size_ === 0;
};

/**
 * Returns the minimum key in the heap. If the heap is empty, null will be
 * returned.
 * @return {libtess.PQKey} [description].
 */
libtess.PriorityQHeap.prototype.minimum = function() {
  return this.handles_[this.nodes_[1]].key;
};

/**
 * Removes the minimum key from the heap and returns it. If the heap is empty,
 * null will be returned.
 * @return {libtess.PQKey} [description].
 */
libtess.PriorityQHeap.prototype.extractMin = function() {
  var n = this.nodes_;
  var h = this.handles_;
  var hMin = n[1];
  var min = h[hMin].key;

  if (this.size_ > 0) {
    n[1] = n[this.size_];
    h[n[1]].node = 1;

    h[hMin].key = null;
    h[hMin].node = this.freeList_;
    this.freeList_ = hMin;

    if (--this.size_ > 0) {
      this.floatDown_(1);
    }
  }

  return min;
};

/**
 * Remove key associated with handle hCurr (returned from insert) from heap.
 * @param {libtess.PQHandle} hCurr [description].
 */
libtess.PriorityQHeap.prototype.remove = function(hCurr) {
  var n = this.nodes_;
  var h = this.handles_;

  libtess.assert(hCurr >= 1 && hCurr <= this.max_ && h[hCurr].key !== null);

  var curr = h[hCurr].node;
  n[curr] = n[this.size_];
  h[n[curr]].node = curr;

  if (curr <= --this.size_) {
    if (curr <= 1 ||
        this.leq_(h[n[curr >> 1]].key, h[n[curr]].key)) {

      this.floatDown_(curr);
    } else {
      this.floatUp_(curr);
    }
  }

  h[hCurr].key = null;
  h[hCurr].node = this.freeList_;
  this.freeList_ = hCurr;
};

/**
 * [floatDown_ description]
 * @private
 * @param {libtess.PQHandle} curr [description].
 */
libtess.PriorityQHeap.prototype.floatDown_ = function(curr) {
  var n = this.nodes_;
  var h = this.handles_;

  var hCurr = n[curr];
  for (;;) {
    // The children of node i are nodes 2i and 2i+1.
    // set child to the index of the child with the minimum key
    var child = curr << 1;
    if (child < this.size_ &&
        this.leq_(h[n[child + 1]].key, h[n[child]].key)) {

      ++child;
    }

    libtess.assert(child <= this.max_);

    var hChild = n[child];
    if (child > this.size_ || this.leq_(h[hCurr].key, h[hChild].key)) {
      n[curr] = hCurr;
      h[hCurr].node = curr;
      break;
    }
    n[curr] = hChild;
    h[hChild].node = curr;
    curr = child;
  }
};

/**
 * [floatUp_ description]
 * @private
 * @param {libtess.PQHandle} curr [description].
 */
libtess.PriorityQHeap.prototype.floatUp_ = function(curr) {
  var n = this.nodes_;
  var h = this.handles_;

  var hCurr = n[curr];
  for (;;) {
    var parent = curr >> 1;
    var hParent = n[parent];
    if (parent === 0 || this.leq_(h[hParent].key, h[hCurr].key)) {
      n[curr] = hCurr;
      h[hCurr].node = curr;
      break;
    }

    n[curr] = hParent;
    h[hParent].node = curr;
    curr = parent;
  }
};

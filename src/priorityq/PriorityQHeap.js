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
   * The heap itself. Active nodes are stored in the range 1..size, with the
   * minimum at 1. Each node stores only an index into verts_ and handles_.
   * @private {!Array<number>}
   */
  this.heap_ = libtess.PriorityQHeap.reallocNumeric_([0],
      libtess.PriorityQHeap.INIT_SIZE_ + 1);

  /**
   * An unordered list of vertices in the heap, with null in empty slots.
   * @private {!Array<libtess.PQKey>}
   */
  this.verts_ = libtess.PriorityQHeap.reallocKeys_([],
      libtess.PriorityQHeap.INIT_SIZE_ + 1);

  /**
   * An unordered list of indices mapping vertex handles into the heap. An entry
   * at index i will map the vertex at i in verts_ to its place in the heap
   * (i.e. heap_[handles_[i]] === i).
   * Empty slots below size_ are a free list chain starting at freeList_.
   * @private {!Array<number>}
   */
  this.handles_ = libtess.PriorityQHeap.reallocNumeric_([0],
      libtess.PriorityQHeap.INIT_SIZE_ + 1);

  /**
   * The size of the queue.
   * @private {number}
   */
  this.size_ = 0;

  /**
   * The queue's current allocated space.
   * @private {number}
   */
  this.max_ = libtess.PriorityQHeap.INIT_SIZE_;

  /**
   * The index of the next free hole in the verts_ array. That slot in handles_
   * has the next index in the free list. If there are no holes, freeList_ === 0
   * and a new vertex must be appended to the list.
   * @private {libtess.PQHandle}
   */
  this.freeList_ = 0;

  /**
   * Indicates that the heap has been initialized via init. If false, inserts
   * are fast insertions at the end of a list. If true, all inserts will now be
   * correctly ordered in the queue before returning.
   * @private {boolean}
   */
  this.initialized_ = false;

  // TODO(bckenny): leq was inlined by define in original, but appears to
  // be vertLeq, as passed. Using injected version, but is it better just to
  // manually inline?
  /**
   * Heap comparison function.
   * @private {function(libtess.PQKey, libtess.PQKey): boolean}
   */
  this.leq_ = leq;

  // Point the first index at the first (currently null) vertex.
  this.heap_[1] = 1;
};

/**
 * The initial allocated space for the queue.
 * @const
 * @private {number}
 */
libtess.PriorityQHeap.INIT_SIZE_ = 32;

/**
 * Allocate a numeric index array of size size. oldArray's contents are copied
 * to the beginning of the new array. The rest of the array is filled with
 * zeroes.
 * @private
 * @param {!Array<number>} oldArray
 * @param {number} size
 * @return {!Array<number>}
 */
libtess.PriorityQHeap.reallocNumeric_ = function(oldArray, size) {
  var newArray = new Array(size);

  // NOTE(bckenny): V8 likes this significantly more than simply growing the
  // array element-by-element or expanding the existing array all at once, so,
  // for now, emulating realloc.
  for (var index = 0; index < oldArray.length; index++) {
    newArray[index] = oldArray[index];
  }

  for (; index < size; index++) {
    newArray[index] = 0;
  }

  return newArray;
};

/**
 * Allocate a PQKey array of size size. oldArray's contents are copied to the
 * beginning of the new array. The rest of the array is filled with null values.
 * @private
 * @param {!Array<libtess.PQKey>} oldArray
 * @param {number} size
 * @return {!Array<libtess.PQKey>}
 */
libtess.PriorityQHeap.reallocKeys_ = function(oldArray, size) {
  var newArray = new Array(size);

  for (var index = 0; index < oldArray.length; index++) {
    newArray[index] = oldArray[index];
  }

  for (; index < size; index++) {
    newArray[index] = null;
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
 * Insert a new vertex into the heap.
 * @param {libtess.PQKey} keyNew The vertex to insert.
 * @return {libtess.PQHandle} A handle that can be used to remove the vertex.
 */
libtess.PriorityQHeap.prototype.insert = function(keyNew) {
  var endIndex = ++this.size_;

  // If the heap overflows, double its size.
  if ((endIndex * 2) > this.max_) {
    this.max_ *= 2;

    this.heap_ = libtess.PriorityQHeap.reallocNumeric_(this.heap_,
        this.max_ + 1);
    this.verts_ = libtess.PriorityQHeap.reallocKeys_(this.verts_,
        this.max_ + 1);
    this.handles_ = libtess.PriorityQHeap.reallocNumeric_(this.handles_,
        this.max_ + 1);
  }

  var newVertSlot;
  if (this.freeList_ === 0) {
    // No free slots, append vertex.
    newVertSlot = endIndex;
  } else {
    // Put vertex in free slot, update freeList_ to next free slot.
    newVertSlot = this.freeList_;
    this.freeList_ = this.handles_[this.freeList_];
  }

  this.verts_[newVertSlot] = keyNew;
  this.handles_[newVertSlot] = endIndex;
  this.heap_[endIndex] = newVertSlot;

  if (this.initialized_) {
    this.floatUp_(endIndex);
  }
  return newVertSlot;
};

/**
 * @return {boolean} Whether the heap is empty.
 */
libtess.PriorityQHeap.prototype.isEmpty = function() {
  return this.size_ === 0;
};

/**
 * Returns the minimum vertex in the heap. If the heap is empty, null will be
 * returned.
 * @return {libtess.PQKey}
 */
libtess.PriorityQHeap.prototype.minimum = function() {
  return this.verts_[this.heap_[1]];
};

/**
 * Removes the minimum vertex from the heap and returns it. If the heap is
 * empty, null will be returned.
 * @return {libtess.PQKey}
 */
libtess.PriorityQHeap.prototype.extractMin = function() {
  var heap = this.heap_;
  var verts = this.verts_;
  var handles = this.handles_;

  var minHandle = heap[1];
  var minVertex = verts[minHandle];

  if (this.size_ > 0) {
    // Replace min with last vertex.
    heap[1] = heap[this.size_];
    handles[heap[1]] = 1;

    // Clear min vertex and put slot at front of freeList_.
    verts[minHandle] = null;
    handles[minHandle] = this.freeList_;
    this.freeList_ = minHandle;

    // Restore heap.
    if (--this.size_ > 0) {
      this.floatDown_(1);
    }
  }

  return minVertex;
};

/**
 * Remove vertex with handle removeHandle from heap.
 * @param {libtess.PQHandle} removeHandle
 */
libtess.PriorityQHeap.prototype.remove = function(removeHandle) {
  var heap = this.heap_;
  var verts = this.verts_;
  var handles = this.handles_;

  libtess.assert(removeHandle >= 1 && removeHandle <= this.max_ &&
      verts[removeHandle] !== null);

  var heapIndex = handles[removeHandle];

  // Replace with last vertex.
  heap[heapIndex] = heap[this.size_];
  handles[heap[heapIndex]] = heapIndex;

  // Restore heap.
  if (heapIndex <= --this.size_) {
    if (heapIndex <= 1 ||
        this.leq_(verts[heap[heapIndex >> 1]], verts[heap[heapIndex]])) {

      this.floatDown_(heapIndex);
    } else {
      this.floatUp_(heapIndex);
    }
  }

  // Clear vertex and put slot at front of freeList_.
  verts[removeHandle] = null;
  handles[removeHandle] = this.freeList_;
  this.freeList_ = removeHandle;
};

/**
 * Restore heap by moving the vertex at index in the heap downwards to a valid
 * slot.
 * @private
 * @param {libtess.PQHandle} index
 */
libtess.PriorityQHeap.prototype.floatDown_ = function(index) {
  var heap = this.heap_;
  var verts = this.verts_;
  var handles = this.handles_;

  var currIndex = index;
  var currHandle = heap[currIndex];
  for (;;) {
    // The children of node i are nodes 2i and 2i+1.
    var childIndex = currIndex << 1;
    if (childIndex < this.size_) {
      // Set child to the index of the child with the minimum vertex.
      if (this.leq_(verts[heap[childIndex + 1]], verts[heap[childIndex]])) {
        childIndex = childIndex + 1;
      }
    }

    libtess.assert(childIndex <= this.max_);

    var childHandle = heap[childIndex];
    if (childIndex > this.size_ ||
        this.leq_(verts[currHandle], verts[childHandle])) {
      // Heap restored.
      heap[currIndex] = currHandle;
      handles[currHandle] = currIndex;
      return;
    }

    // Swap current node and child; repeat from childIndex.
    heap[currIndex] = childHandle;
    handles[childHandle] = currIndex;
    currIndex = childIndex;
  }
};

/**
 * Restore heap by moving the vertex at index in the heap upwards to a valid
 * slot.
 * @private
 * @param {libtess.PQHandle} index
 */
libtess.PriorityQHeap.prototype.floatUp_ = function(index) {
  var heap = this.heap_;
  var verts = this.verts_;
  var handles = this.handles_;

  var currIndex = index;
  var currHandle = heap[currIndex];
  for (;;) {
    // The parent of node i is node floor(i/2).
    var parentIndex = currIndex >> 1;
    var parentHandle = heap[parentIndex];

    if (parentIndex === 0 ||
        this.leq_(verts[parentHandle], verts[currHandle])) {
      // Heap restored.
      heap[currIndex] = currHandle;
      handles[currHandle] = currIndex;
      return;
    }

    // Swap current node and parent; repeat from parentIndex.
    heap[currIndex] = parentHandle;
    handles[parentHandle] = currIndex;
    currIndex = parentIndex;
  }
};

/* jshint node: true */

module.exports = {
  // self-intersecting contour collapsed to a set of edges
  // should result in no geometry
  name: 'Degenerate Hourglass',
  value: [
    [
      // coincides with intersection of the two main edges
      0, 0, 0,
      1, 1, 0,
      -1, -1, 0,
      // also at the intersection
      0, 0, 0,
      1, -1, 0,
      -1, 1, 0
    ]
  ]
};

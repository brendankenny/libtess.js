/* jshint node: true */

module.exports = {
  // three contours with shared edges but no shared vertices
  name: 'Shared Borders',
  value: [
    // anticlockwise
    [
      1, 3, 0,
      -4, 3, 0,
      -4, -3, 0,
      1, -3, 0
    ],
    // anticlockwise
    [
      3, 1, 0,
      1, 1, 0,
      1, -2, 0
    ],
    // clockwise
    [
      0, 0, 0,
      0, -3, 0,
      -1, -3, 0,
      -1, 0, 0
    ],
    // clockwise
    [
      -2, 3, 0,
      -2, 0, 0,
      // collinear vertex
      0, 0, 0,
      7 / 3, 0, 0,
      5 / 3, -1, 0,
      -3, -1, 0,
      -3, 3, 0
    ]
  ]
};

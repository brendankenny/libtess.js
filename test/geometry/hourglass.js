/* jshint node: true */

module.exports = {
  // simple self intersecting shape
  // bottom of hourglass is anticlockwise, top is clockwise
  'name': 'Hourglass',
  'value': [
    [
      1, 1, 0,
      -1, -1, 0,
      1, -1, 0,
      -1, 1, 0
    ]
  ]
};

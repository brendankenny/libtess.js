/* jshint node: true */

// Provides a rfolder implementation for when not being run through
// browserify -t rfolderify
// NOTE(bckenny): if I'm totally misunderstanding how rfolderify is supposed to
// work, please let me know :)

var fs = require('fs');
var path = require('path');

module.exports = function rfolder(dirname) {
  var absoluteDirPath = path.join(__dirname, dirname);
  return fs.readdirSync(absoluteDirPath).map(function(filename) {
    var filePath = path.join(absoluteDirPath, filename);
    return require(filePath);
  });
};

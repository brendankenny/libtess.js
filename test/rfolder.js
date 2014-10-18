/* jshint node: true */

// Provides a rfolder implementation for when not being run through
// browserify -t rfolderify
// NOTE(bckenny): if I'm totally misunderstanding how rfolderify is supposed to
// work, please let me know :)

var fs = require('fs');

module.exports = function rfolder(dirname) {
  return fs.readdirSync('./test/geometry').map(function(filename) {
    return require('./geometry/' + filename);
  });
};

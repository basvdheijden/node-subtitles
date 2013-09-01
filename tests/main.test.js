var Subtitles = require('../index'),
    child_process = require('child_process'),
    fs = require('fs');

module.exports = {
  setUp: function(callback) {
    callback();
  },

  tearDown: function(callback) {
    child_process.exec('rm -rf ' + process.cwd() + '/tests/*.srt', function() {
      callback();
    });
  },

  mainTest: function(test) {
    test.expect(3);

    var path = process.cwd() + '/tests/breakdance.avi';

    test.ok(fs.existsSync(path), 'The path to the movie file should exist.');
    Subtitles(path, function(err, subtitles) {
      test.equal(err, null, 'There should be no errors while processing this file.');
      test.ok(subtitles.length, 'Subtitles should\'ve been found.');

      test.done();
    });
  }
};
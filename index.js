var OpenSubtitles = require('opensubtitles'),
  fs = require('fs'),
//  glob = require('glob'),
  hyperquest = require('hyperquest'),
  debug = require('debug')('subtitles'),
  path = require('path'),
  zlib = require('zlib'),
  util = require('util'),
  async = require('async'),
  exec = require('child_process').exec;

module.exports = exports = function(file, cb) {
  var self = this;

  self.max = 7;
  self.original = file;
  self.file = file;
  self.basename = path.basename(file);
  self.cb = cb;
  self.subtitles = [];

  self.start = function() {
    self.api = new OpenSubtitles('', '', 'nl');
    self.api.computeHash(self.file, function(err, size) {
      if (err) {
        self.cb(err, false);
        return;
      }

      debug('Size determined for ' + self.basename);
      self.api.checkMovieHash([size], function(err, res) {
        if (err) {
          debug('checkMovieHash returned error for ' + self.file);
          self.cb(err, false);
          return;
        }

        if (res.data[size] === 'undefined' || res.data[size].length < 1) {
          debug('Size could not be determined for ' + self.basename + '. Hash: ' + size);
          self.cb('Size could not be determined for ' + self.basename + '. Hash: ' + size, false);
          return;
        }

        var data = res.data[size];
        var token = res.token;

        var searchArguments = [{
          moviebytesize: self.api.file_size,
          moviehash: size,
          sublanguageid: 'dut'
        }, {
          moviebytesize: self.api.file_size,
          moviehash: size,
          sublanguageid: 'en'
        }, {
          imdbid: data.MovieImdbID,
          sublanguageid: 'dut'
        }, {
          imdbid: data.MovieImdbID,
          sublanguageid: 'en'
        }, {
          query: data.MovieName,
          sublanguageid: 'dut',
        }, {
          query: data.MovieName,
          sublanguageid: 'en'
        }];

        debug('Performing search for ' + self.basename);

        async.series(searchArguments.map(function(item) {
          return function(cb) {
            self.search(item, token, cb);
          };
        }), function() {
          self.subtitles.forEach(function(subtitle, index) {
            var fileName = util.format('%s/%s.%s.%s.%s', path.dirname(self.original), path.basename(self.original), subtitle.IDSubtitleFile, subtitle.ISO639, 'srt');

            debug('Created filename: ' + fileName + ' for downloadLink: ' + subtitle.SubDownloadLink);

            var file = fs.createWriteStream(fileName);
            // Space out the downloads.
            setTimeout(function() {
              hyperquest(subtitle.SubDownloadLink, {
                headers: {
                  'Accept-Encoding': 'gzip'
                }
              }, function(err, res) {
                if (err) {
                  return;
                }

                res.pipe(zlib.createGunzip()).pipe(file);
              });

              file.on('finish', function() {
                exec('dos2unix ' + fileName);
                debug('Dos2unix written!');
              });
            }, index * 100);
          });

          self.cb(null, self.subtitles);
        });
      });
    });
  };

  self.search = function(arg, token, cb) {
    if (self.subtitles.length >= self.max) {
      debug('Reached max.');
      cb();
      return;
    }

    self.api.api.SearchSubtitles(function(err, res) {
      if (err) {
        cb();
        return;
      }

      if (typeof res.data === 'undefined' || res.data === false || res.data.length === 0) {
        cb();
        return;
      }

      if (res.data.length >= self.max) {
        res.data = res.data.splice(0, 10);
      }

      debug('Subtitles found.');
      self.subtitles = self.subtitles.concat(res.data);
      cb();
    }, token, [arg]);
  };

  self.start();
};
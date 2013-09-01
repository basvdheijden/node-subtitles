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
  self.subtitles = {};
  self.api = new OpenSubtitles('', '', 'nl');

  self.start = function() {
    self.api.computeHash(self.file, function(err, size) {
      if (err) {
        self.cb(err, false);
        return;
      }

      debug('Size determined for ' + self.basename + '. ' + size);
      self.api.api.CheckMovieHash(function(err, res) {
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

        debug('Data: ' + res.data[size].MovieHash + ' - Token: ' + self.token);

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
          sublanguageid: 'dut'
        }, {
          query: data.MovieName,
          sublanguageid: 'en'
        }];

        debug('Performing search for ' + self.basename);

        async.series(searchArguments.map(function(item) {
          return function(cb) {
            self.search(item, self.token, cb);
          };
        }), function() {
          Object.keys(self.subtitles).forEach(function(key, index) {
            var subtitle = self.subtitles[key];
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

          var result = Object.keys(self.subtitles).map(function(key) {
            return self.subtitles[key];
          });

          self.cb(null, result);
        });
      }, self.token, [size]);
    });
  };

  self.search = function(arg, token, cb) {
    if (self.subtitles.length >= self.max) {
      debug('Reached max.');
      cb();
      return;
    }

    debug('Searching with arg: ' + JSON.stringify(arg));
    debug('Searching with token: ' + token);

    self.api.api.SearchSubtitles(function(err, res) {
      if (err) {
        debug('There was an error while searching the subtitles.');
        cb();
        return;
      }

      if (typeof res.data === 'undefined' || res.data === false || res.data.length === 0) {
        debug('There was no result from searching the subtitles.');
        cb();
        return;
      }

      debug('%d subtitles found.', res.data.length);

      var subs = res.data.filter(function(item) {
        if (typeof item.SubDownloadLink === 'undefined' || typeof self.subtitles[item.SubDownloadLink] !== 'undefined') {
          return false;
        }

        return true;
      });

      debug('%d subtitles left.', subs.length);

      if (subs.length >= self.max) {
        debug('There were many subtitles. Slicing 10 items.');
        subs = subs.splice(0, 10);
      }

      subs.map(function(item) {
        self.subtitles[item.SubDownloadLink] = item;
      });

      debug('Currently having %d subtitle(s) globally.', Object.keys(self.subtitles).length);

      cb();
    }, token, [arg]);
  };

  self.api.api.LogIn(function(err, res) {
    if (err) {
      debug('Error while logging into OpenSubtitles.');
      self.cb(err);
      return;
    }

    if (!res.token) {
      var msg = 'Did not get token for session.';
      debug(msg);
      self.cb(new Error('msg'));
      return;
    }

    debug('Logged in succesfully.');
    self.token = res.token;
    self.start();
  }, '', '', 'nl', 'NodeOpensubtitles v0.0.1');
};
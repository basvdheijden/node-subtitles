module.exports = function(grunt) {
  var gruntSettings = {
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      all: [
        'Gruntfile.js',
        'index.js'
      ],

      options: {
        'curly': true,
        'eqeqeq': true,
        'globals': {
          'jQuery': true,
          '$': true,
          'document': true,
          'window': true
        },
        'forin': true,
        'immed': true,
        'indent': 2,
        'latedef': true,
        'newcap': true,
        'noarg': true,
        'sub': true,
        'unused': true,
        'undef': true,
        'boss': true,
        'eqnull': true,
        'node': true,
        'quotmark': 'single',
        'trailing': true
      }
    },

    nodeunit: {
      all: ['tests/*.test.js']
    }
  };

  grunt.initConfig(gruntSettings);

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Run all tests
  grunt.registerTask('default', ['jshint', 'nodeunit']);
};
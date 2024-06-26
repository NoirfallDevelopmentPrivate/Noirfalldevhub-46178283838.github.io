// Generated by CoffeeScript 2.5.1

/*
Provides request.js locations for each module loaded via ModuleServer.

@example Loading ModuleConfig via RequireJS
  class MyModule
    ...
  requirejs ["/modules/ModuleConfig.js"], (ModuleConfig) ->
    new ModuleConfig ->
      define "MyModule", ["Dependency1", "Dependency2"], (dep1, dep2) -> MyModule

@example Fetching Blade configuration via RequireJS storage
  class SubModule
    ...
  define "SubModule", ["node-blade", "Dep1", "Dep2", "module"], (blade, dep1, dep2, module) ->
    blade.Runtime.options.mount = module.config().blade
    SubModule
*/
var $, ModuleConfig,
  hasProp = {}.hasOwnProperty;

$ = null;

ModuleConfig = (function() {
  class ModuleConfig {
    // @param [Function] cb A callback to run after the configuration has been initialized.
    constructor(cb1) {
      this.cb = cb1;
      this.fetchModules((modules) => {
        return this.parseModules(modules, (config) => {
          return this.setConfig(config, () => {
            return this.cb();
          });
        });
      });
    }

    /*
    Fetches the module information from ModuleServer's output at /modules/.
    @param [Function] cb A callback to give the returned JSON.
    */
    fetchModules(cb) {
      return $.getJSON("/modules/", (data) => {
        return cb(data);
      });
    }

    /*
    Parses the raw data from /modules/ (created by ModuleServer) into a format usable by Require.js
    @param [Object] modules The ModuleServer output
    @param [Function] cb Called with the generated configuration options
    */
    parseModules(modules, cb) {
      var config, i, len, location, main, name, paths, subpath;
      config = {
        config: {},
        shim: {
          "socket.io": {
            exports: "io"
          },
          "blade": {
            exports: "blade"
          },
          spark: {
            exports: "Spark"
          },
          "blade-liveui": {
            deps: ["blade", "spark"],
            exports: "blade"
          }
        },
        paths: {
          blade: "/blade/blade",
          "blade-liveui": "/blade/plugins/liveui",
          //spark: "https://cdn.jsdelivr.net/gh/devstudio/spark-standalone@master/spark.min"
          jquery: "/jquery.js",
          //moment: "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.14.1/moment.min"
          //livestamp: "https://cdn.jsdelivr.net/gh/mattbradley/livestampjs@develop/livestamp"
          //bluebird: "https://cdnjs.cloudflare.com/ajax/libs/bluebird/3.4.1/bluebird.min"
          "socket.io": "/socket.io/socket.io"
        },
        map: {
          "*": {}
        }
      };
      for (i = 0, len = modules.length; i < len; i++) {
        ({name, main, paths} = modules[i]);
        config.paths[name] = main.replace(/^(.*)\.js$/, "$1");
        console.log(`## Loaded ${main} as ${name} ##`);
        for (subpath in paths) {
          if (!hasProp.call(paths, subpath)) continue;
          location = paths[subpath];
          console.log(`${name}/${subpath} points to ${location}`);
          config.map["*"][`${name}/${subpath}`] = location;
        }
        config.config[name] = {
          public: `/module/${name}/`,
          blade: `/module/${name}/blade/views/`
        };
      }
      return cb(config);
    }

    setConfig(config, cb) {
      requirejs.config(config);
      return cb();
    }

  };

  // @property [Function] A function to call once the module configuration has been fully initialized.
  ModuleConfig.prototype.cb = null;

  return ModuleConfig;

}).call(this);

requirejs.config({
  paths: {
    jquery: "/jquery"
  }
});

//define "ModuleConfig", ["/jquery.js"], (_$) ->
define(["jquery"], function(jquery) {
  $ = jquery;
  return ModuleConfig;
});

//# sourceMappingURL=ModuleConfig.js.map

var $, ModuleConfig, hasProp = {}.hasOwnProperty;
$ = null;
ModuleConfig = (function() {
    class ModuleConfig {
        constructor(cb1) {
            this.cb = cb1;
            this.fetchModules((modules)=>{
                return this.parseModules(modules, (config)=>{
                    return this.setConfig(config, ()=>{
                        return this.cb();
                    }
                    );
                }
                );
            }
            );
        }
        fetchModules(cb) {
            return $.getJSON("/modules/", (data)=>{
                return cb(data);
            }
            );
        }
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
                    jquery: "/jquery.js",
                    "socket.io": "/socket.io/socket.io"
                },
                map: {
                    "*": {}
                }
            };
            for (i = 0,
            len = modules.length; i < len; i++) {
                ({name, main, paths} = modules[i]);
                config.paths[name] = main.replace(/^(.*)\.js$/, "$1");
                console.log(`## Loaded ${main} as ${name} ##`);
                for (subpath in paths) {
                    if (!hasProp.call(paths, subpath))
                        continue;
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
    }
    ;ModuleConfig.prototype.cb = null;
    return ModuleConfig;
}
).call(this);
requirejs.config({
    paths: {
        jquery: "/jquery"
    }
});
define(["jquery"], function(jquery) {
    $ = jquery;
    return ModuleConfig;
});

(function() {

  /*
  Displays a full-screen page with the majority of the IDE components enabled.

  @extend FlexSplit.Parent
  @extend BladeComponent
  @extend ModuleConfigObject
  */
  var $, BladeComponent, Editor, ErrorDisplay, ErrorLog, FlexSplit, Graph, IDE, IDEMenu, Logging, NavTLV, Project, Promise, ServerCompile, StaticPanes, TabbedView, UserAuth, Utils, VizPane, WaveformViewer, ref,
    hasProp = {}.hasOwnProperty;

  [BladeComponent, $, Logging, Utils, Promise, ErrorDisplay, ErrorLog, UserAuth, Project, ServerCompile, IDEMenu, FlexSplit, TabbedView, Editor, Graph, VizPane, WaveformViewer, StaticPanes, NavTLV] = [];

  IDE = (function() {
    class IDE {
      constructor() {
        var agent, tlvPromise, vcdPromise;
        /*
        Open a {Pane} of @staticPanes if a pane by the given name does not already exist in the IDE, otherwise
        activate the existing pane.
        @param {String} mnemonic The name of the pane.
        @param {boolean} background Truthy to not activate the tab.
        @return {Promise<Pane>}
        */
        this.openStaticPane = this.openStaticPane.bind(this);
        this.staticPanes = new StaticPanes();
        // Give FlexSplit a TabbedView. It can't require it due to a circular dependency.
        FlexSplit.TabbedView = TabbedView;
        agent = navigator.userAgent;
        if (agent.search("Chrome") < 0 && agent.search("Safari") < 0 && agent.search("Edge") < 0 && agent.search("Firefox") < 0) {
          window.alert("Makerchip is not tested for your browser." + " We recommend Chrome, Safari, Firefox, or Edge (Chrome is best).");
        }
        // Add fragment identifier to URL if it is not already there, without adding to browser history.
        // This prevents other actions from adding to the history.
        if (!window.location.href.includes("#")) {
          window.location.replace(window.location.href + "#");
        }
        this.path = "ide";
        // For loading code and waveform from URL parameters.
        tlvPromise = Promise.resolve(null);
        vcdPromise = Promise.resolve(null);
        this._loaded = this.compileComponent("IDE", {path: this.path}, this.blade).then((html) => {
          // Load HTML.
          Utils.$one(`#${this.path}`).html(html);
          // Init components.
          //@err(ErrorDisplay),
          return Promise.join(new ServerCompile().init(), new ErrorDisplay().init(this.childPath("err")), new Project().init());
        }).then(([compiler, errModal, project]) => {
          var menuOpts;
          //feedback = new BugReport()
          menuOpts = {
            //feedback,
            title: $("title").attr("data-title"),
            subtitle: $("title").attr("data-subtitle")
          };
          // TODO: Note that menuOpts.feedback isn't yet initialized.  IDEMenu().init(@childPath("menu")),
          return Promise.join(Promise.resolve(project), Promise.resolve(compiler), Promise.resolve(errModal), new IDEMenu().init(this.childPath("menu"), menuOpts), new UserAuth().init(errModal), null);
        //feedback.init(@childPath("feedback")),
        //new LoginModal().init(@childPath("login")),
        }).then((all) => {
          var bugReport, codeURL, codeURLArg, compiler, errModal, exampleCode, menu, project, url, user, vcdURL, vcdURLArg;
          [project, compiler, errModal, menu, user, bugReport] = all; // , loginForm
          compiler.setProject(project);
          menu.project(project);
          //bugReport.project project
          //bugReport.compiler compiler
          this.initFlexSplit("horizontal");
          // Load code and waveform based on URL parameters.
          if (!project.user && !project.path) {
            // Load code (?example_code or "default.tlv"). (Hangs in PhantomJS, so disable.)
            codeURL = `${this.public}default.tlv`;
            vcdURL = null;
            if (this.paramsOk()) {
              url = new URL(window.location.href);
              // code_url
              codeURLArg = url.searchParams.get("code_url");
              if (codeURLArg != null) {
                codeURL = codeURLArg;
              } else {
                exampleCode = url.searchParams.get("example_code");
                if (exampleCode != null) {
                  codeURL = `${this.public}${exampleCode}`;
                }
              }
              // vcd_url
              vcdURLArg = url.searchParams.get("vcd_url");
              if (vcdURLArg != null) {
                vcdURL = vcdURLArg;
              }
            }
            
            // Load the TLV code.
            //console.log("codeURL: #{codeURL}")
            tlvPromise = $.get(`${codeURL}`).catch(function() {
              console.log(`Failed to find ${codeURL}. Using default code.`);
              codeURL = `${this.public}default.tlv`;
              return $.get(`${codeURL}`);
            });
            
            // Load the waveform.
            vcdPromise = $.get(`${vcdURL}`).catch(function() {
              console.log(`Failed to find ${vcdURL}.`);
              return null;
            });
          }
          return Promise.join(this.createLeft(project, compiler, this.split), this.createRight(project, compiler, this.split), function(left, right) {
            return project;
          });
        }).then((project) => {
          var i, len, modelViews, mythArg, ref, tab, tabsArg;
          modelViews = [];
          if (this.graph != null) {
            this.graph.modelViews(modelViews);
          }
          if (this.viewer != null) {
            this.viewer.modelViews(modelViews);
          }
          if (this.navtlv != null) {
            this.navtlv.modelViews(modelViews);
          }
          this.project = project;
          this.project.initIDE(this);
          // Open tabs requested in the URL.
          if (this.paramsOk()) {
            tabsArg = new URL(window.location.href).searchParams.get("tabs");
            if (tabsArg != null) {
              ref = tabsArg.split(",");
              for (i = 0, len = ref.length; i < len; i++) {
                tab = ref[i];
                this.openStaticPane(tab);
              }
            }
            // For MYTH workshop, open MYTH tabs if there a "myth" get parameter or the host subdomain begins with "myth".
            mythArg = new URL(window.location.href).searchParams.get("myth");
            if (window.location.hostname.startsWith("myth") || (mythArg != null)) {
              this.openStaticPane("MYTH Slides");
              this.openStaticPane("MYTH Videos");
            }
          }
          // Done loading. Fade out and stop loading animation.
          Utils.$one("#loading").fadeOut();
          if (window.mcLoadingInterval != null) {
            clearInterval(window.mcLoadingInterval);
          } else {
            console.warn("mcLoadingInterval not defined.");
          }
          this.project.setSaveState(null); // Initial state to update UI.
          return Promise.join(tlvPromise, vcdPromise);
        }).then(([tlv, vcd]) => {
          if (vcd) {
            this.project.setLockedVCD(vcd);
          }
          if (tlv) {
            this.editor.setTLV(tlv, true, true);
            return this.project.saveChangeGeneration = this.editor.editor.changeGeneration(true);
          }
        }).error(function(err) {
          return console.log(err);
        });
      }

      // Construct and initialize the {FlexSplit} for this {IDE}.
      // @parameter {"horizontal", "vertical", "single"} direction The direction of the split.
      // @return {FlexSplit} the new {FlexSplit}
      initFlexSplit(direction) {
        return this.split = new FlexSplit().init(this.childPath("split"), direction, this, "child");
      }

      paramsOk() {
        var ref;
        return (typeof window !== "undefined" && window !== null ? (ref = window.location) != null ? ref.href : void 0 : void 0) && navigator.userAgent.search("PhantomJS") < 0;
      }

      createLeft(project, compiler, split) {
        var tabbed;
        tabbed = null;
        return split.addTabbedChild("left").then((tabbed) => {
          tabbed.intoSplit("left", split);
          return Promise.join(new Editor().init("Editor", this, project), new ErrorLog().init("Log", this, project), new NavTLV().init("Nav-TLV", this, project), Promise.resolve(tabbed));
        }).then(([editor, errorlog, navtlv, tabbed]) => {
          this.editor = editor;
          this.errorlog = errorlog;
          this.navtlv = navtlv;
          editor.setCompiler(compiler);
          errorlog.compiler(compiler);
          navtlv.compiler(compiler);
          navtlv.editor(editor);
          // Open the panes created asynchronously in the order they are to
          // appear in the tabbedview.
          return editor.open(tabbed).then(function() {
            return navtlv.open(tabbed);
          }).then(function() {
            errorlog.open(tabbed);
            return [editor, navtlv, errorlog, tabbed];
          });
        }).then(function([editor, navtlv, errorlog, tabbed]) {
          project.editor(editor);
          return tabbed.activatePane(editor);
        });
      }

      createRight(project, compiler, split) {
        var tabbed;
        tabbed = null;
        return split.addTabbedChild("right").then((tabbed) => {
          tabbed.intoSplit("right", split);
          return Promise.join(new Graph().init("Diagram", this, project), new VizPane().init("Viz", this, project), new WaveformViewer().init("Waveform", this, project), Promise.resolve(tabbed));
        }).then(([graph, viz, viewer, tabbed]) => {
          this.graph = graph;
          this.viz = viz;
          this.viewer = viewer;
          graph.compiler(compiler);
          if (viz !== null) {
            viz.setCompiler(compiler);
          }
          viewer.compiler(compiler);
          return Promise.all([graph.open(tabbed), viz !== null ? viz.open(tabbed) : null, viewer.open(tabbed)]);
        }).catch(function(err) {
          return console.log(`Failed to initialize right pane: ${err}`);
        }).then(function([graph, viz, viewer]) {
          return graph.activate();
        });
      }

      /*
      Get a {TabbedView} (the upper-left-most one)
      */
      getATabbedView() {
        var split;
        split = this.split;
        while (split instanceof FlexSplit) {
          // Get split, favoring top/left.
          split = split.children.left ? split.children.left : split.children.top ? split.children.top : split.children.center;
        }
        Utils.assert(split instanceof TabbedView, "FlexSplit leaf not TabbedView");
        return split;
      }

      /*
      Load a TLV file from a URL.
      @param {String} url The URL of the file to load.
      @return {Promise} a promise that resolves when the file is loaded.
      */
      loadTLVURL(url) {
        var tlvPromise;
        if (typeof window.ga === "function") {
          window.ga("send", {
            hitType: "event",
            eventCategory: "TLV File",
            eventAction: "load",
            eventLabel: url
          });
        }
        // Warn if we're loading contents that are autosaved.
        if ((this.project.path || this.project.localFileHandle) && !this.project.localConnected) {
          window.alert("Loading code that will overwrite your current work. Use Ctrl-Z in Editor to restore.");
        }
        return tlvPromise = $.get(url).then((tlv) => {
          return this.editor.setTLV(tlv, false, true);
        });
      }

      /*
      Load a TLV file from a static page given a URL.  If Google Analytics is loaded, also inform Analytics.
      @param {String} mnemonic the static page identifier
      @param {Integer} position **Optional** for tutorials, the position of the tutorial on the page (1st, 2nd, etc.)
        For other pages (help, etc.) assign unique URLs to each TLV loaded.
      @param {String} url The URL of the file to load.
      See {IDE#loadTLVURL} for actual implementation.
      */
      loadStaticPageTLV(mnemonic, position, url) {
        if (!url && position) {
          [url, position] = [position, null];
        }
        if (typeof window.ga === "function") {
          window.ga("send", {
            hitType: "event",
            eventCategory: "Static Page",
            eventAction: "load code",
            eventLabel: mnemonic,
            eventValue: position
          });
        }
        return this.loadTLVURL(url);
      }

      /*
      An onclick for TOC links in Tutorial/Example/Etc {Pane}s to scroll to an anchor.
      Requires a position reference anchor named "top" at the top of the mc-auto-pane-contents
      and an anchor to scroll to.
      (I'm sure there's a better way.)
      @param {HTMLElement} linkEl the element clicked
      @param {String} toEl the ID of the element to which to scroll (without "#")
      */
      anchorLink(linkEl, toEl) {
        var contents;
        contents = $(linkEl).parents(".mc-auto-pane-contents");
        return contents.animate({
          scrollTop: $(`a[name='${toEl}']`, contents).offset().top - $("a[name='top']", contents).offset().top
        }, 400);
      }

      /*
      Return a URL to share on URL on linkedin.
      @param {String} url the URL to share
      @param {String} title the title of the post
      @param {String} summary a summary to include in the post
      @param {String} source a description of the URL being shared
      */
      linkedinShareURL(url, title, summary, source) {
        return "https://www.linkedin.com/shareArticle?mini=true" + "&url=" + encodeURIComponent(url) + "&title=" + encodeURIComponent(title) + "&summary=" + encodeURIComponent(summary) + "&source=" + encodeURIComponent(source);
      }

      /*
      onClick for Linkedin certificate.
      */
      linkedinCertificateURL() {
        // Can't share the certificate, since it's not an image, and the title/summary/source args don't seem to work,
        // so there's no way to share the certificate link. Just sharing Makerchip.com instead.
        // https://makerchip.com/module/IDE/TLVCertificate.html?name=#{$('#name').val()}
        return window.open(this.linkedinShareURL("https://makerchip.com", "TL-Verilog Certificate", "I got my TL-Verilog certification at makerchip.com! #makerchip #tlverilog", "makerchip.com"));
      }

      openStaticPane(mnemonic, background) {
        var existingPane;
        existingPane = TabbedView.allPanes[mnemonic];
        // Ensure that Pane is initialized.
        // Bring pane to front.
        // Pane not yet initialized (because it's not registered w/ TabbeddView class).
        return Promise.resolve(existingPane !== void 0 ? (!background ? existingPane.activate() : void 0, existingPane) : this.staticPanes.init(mnemonic)).then((pane) => {
          return this._loaded.then(() => {
            var tabbed;
            if (!pane.opened) {
              tabbed = this.getATabbedView();
              return pane.open(tabbed).then(function() {
                if (!background) {
                  tabbed.activatePane(pane);
                }
                return pane;
              });
            }
          });
        });
      }

    };

    /*
    @property {Promise} Resolves when the IDE is fully loaded.
    */
    IDE.prototype._loaded = null;

    // @property {FlexSplit} The top-level {FlexSplit} of the {IDE}.
    IDE.prototype.split = null;

    // @property {StaticPanes} The {StaticPanes}.
    IDE.prototype.staticPanes = null;

    // TODO: These should be eliminated in favor of project.*.

    // @property {Project} The Project (currently assumed to be a single project per IDE).
    IDE.prototype.project = null;

    // @property {Editor} The {Editor} {Pane}.
    IDE.prototype.editor = null;

    // @property {CompileErrorLog} The {CompileErrorLog} {Pane}.
    IDE.prototype.errorlog = null;

    // @property {NavTLV} The {NavTLV} {Pane}.
    IDE.prototype.navtlv = null;

    // @property {Graph} The {Graph} {Pane}.
    IDE.prototype.graph = null;

    // @property {VizPane} The {VizPane} {Pane}.
    IDE.prototype.viz = null;

    // @property {WaveformViewer} The {WaveformViewer} {Pane}.
    IDE.prototype.viewer = null;

    return IDE;

  }).call(this);

  define("IDE-loaded", function(require) {
    BladeComponent = require("BladeComponent");
    $ = require("jquery");
    Logging = require("Logging");
    Utils = require("Utils");
    Promise = require("bluebird");
    ErrorDisplay = require("ErrorDisplay");
    ErrorLog = require("ErrorLog");
    UserAuth = require("UserAuth");
    Project = require("Project");
    ServerCompile = require("ServerCompile");
    IDEMenu = require("IDEMenu");
    FlexSplit = require("FlexSplit");
    TabbedView = require("TabbedView");
    Editor = require("Editor");
    Graph = require("Graph");
    VizPane = require("VizPane");
    WaveformViewer = require("WaveformViewer");
    StaticPanes = require("StaticPanes");
    //-LoginModal = require "LoginModal"
    //BugReport = require "BugReport"
    NavTLV = require("NavTLV");
    return IDE;
  });

  /*
  Prevent RequireJS from timing out and breaking the site.
  (Should now be provided at window level on requirejs load.)
  */
  //  waitSeconds: 0
  define([`${(ref = window.BASE_API_URL) != null ? ref : ""}/modules/ModuleConfig.js`, "module"], function(ModuleConfig, module) {
    var CustomModuleConfig, baseApi, ideConfig, ref1;
    baseApi = (ref1 = window.BASE_API_URL) != null ? ref1 : "";
    ideConfig = {};
    /*
    Less than pretty hack - ModuleConfig assumes that the same URL that serves the front-end is also the backend.

    The NestJS + React code development flow work best as two separate `localhost` ports, which ModuleServer
    can't handle.

    `CustomModuleConfig` rewires URLs to allow an optional `baseApi` variable to be used.
    This hack is backwards compatible - if React defines `window.BASE_API_URL` the hack will be useful,
    otherwise all URLs will remain untouched.
    */
    CustomModuleConfig = class CustomModuleConfig extends ModuleConfig {
      fetchModules(cb) {
        return window.$.getJSON(`${baseApi}/modules/`, function(data) {
          return cb(data);
        });
      }

      parseModules(modules, cb) {
        return super.parseModules(modules, function(config) {
          var configSect, configVal, configVals, configVar, filePath, moduleName, modulePath, ref2, ref3, ref4, sourcePath;
          ref2 = config.config;
          for (configSect in ref2) {
            if (!hasProp.call(ref2, configSect)) continue;
            configVals = ref2[configSect];
            for (configVar in configVals) {
              if (!hasProp.call(configVals, configVar)) continue;
              configVal = configVals[configVar];
              if (typeof configVal === "string" && configVal[0] === "/") {
                configVals[configVar] = `${baseApi}${configVal}`;
              }
            }
            if (configSect === "IDE") {
              ideConfig = configVals;
            }
          }
          ref3 = config.paths;
          for (moduleName in ref3) {
            if (!hasProp.call(ref3, moduleName)) continue;
            modulePath = ref3[moduleName];
            if (modulePath[0] === "/") {
              config.paths[moduleName] = `${baseApi}${modulePath}`;
            }
          }
          ref4 = config.map["*"];
          for (sourcePath in ref4) {
            if (!hasProp.call(ref4, sourcePath)) continue;
            filePath = ref4[sourcePath];
            if (filePath[0] === "/") {
              config.map["*"][sourcePath] = `${baseApi}${filePath}`;
            }
          }
          return cb(config);
        });
      }

    };
    return new CustomModuleConfig(function() {
      return require(["IDE-loaded"], function(IDE) {
        //$.extend IDE::, FlexSplit.Parent, BladeComponent, module.config()
        Utils.extend(IDE, ideConfig);
        Utils.extend(IDE, BladeComponent);
        Utils.extend(IDE, FlexSplit.Parent);
        return window.ide = new IDE();
      });
    });
  });

}).call(this);

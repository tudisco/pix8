/**
 * PIX8 - Main Application Module
 *
 * Pix8 is the primary application interface that orchestrates the image carousel system,
 * site navigation, and user interaction. It creates a unified interface for browsing,
 * organizing, and managing visual content across websites, Wikipedia articles, and
 * user-generated collections.
 *
 * CORE FUNCTIONALITY:
 * -------------------
 * 1. Application Initialization - Sets up the main UI components and layout
 * 2. Carousel Management - Creates and manages multiple image carousels
 * 3. Site Navigation - Handles URL routing and website integration
 * 4. Search Interface - Provides search across words, sites, and content
 * 5. Input Processing - Manages user input for URLs, tags, and commands
 * 6. Browser Integration - Electron/Chrome extension compatibility
 * 7. Content Organization - Organizes content by words, sites, and collections
 *
 * UI STRUCTURE:
 * -------------
 * [Header Bar]
 *   - Menu Button (☰)
 *   - URL Input Field
 *   - Window Controls (Electron: Dev Tools, Minimize, Close)
 *
 * [Carousels] (Dynamic)
 *   - Main Site Carousel
 *   - Additional Word/Topic Carousels
 *   - Each carousel shows related images
 *
 * [Input Area]
 *   - Tag/URL Input Field
 *   - Drag-to-resize functionality
 *
 * [Side Panel] (Toggleable)
 *   - Search Results
 *   - Word/Topic List
 *   - Site History
 *
 * NAVIGATION PATTERNS:
 * --------------------
 * - URL Input: Navigate to websites, load site-specific image collections
 * - Tag Input: Create carousels for specific words/topics
 * - Search: Find existing words, sites, or content
 * - Drag Resize: Adjust carousel heights and scroll positions
 *
 * DATA MANAGEMENT:
 * ----------------
 * Uses DAT/IPFS links for distributed storage:
 * - Me.link + 'words' → User's word collections
 * - Me.link + 'sites' → User's site collections
 * - MD5 hashing for site identification
 * - YAML format for metadata storage
 *
 * PLATFORM INTEGRATION:
 * ----------------------
 * - Electron: Window controls, file system access, native features
 * - Chrome Extension: Content script injection, browser integration
 * - Web App: Standard browser functionality with responsive design
 *
 * WORKFLOW EXAMPLES:
 * ------------------
 * 1. Site Navigation:
 *    Enter URL → Load site data → Display related images in carousel
 *
 * 2. Word Exploration:
 *    Enter word → Create new carousel → Load word-related content
 *
 * 3. Wikipedia Integration:
 *    Navigate to wiki page → Extract topic → Load related media
 *
 * 4. Search & Discovery:
 *    Open menu → Search term → Select result → Load content
 *
 * @module Pix8
 * @requires Carousel - Image carousel component
 * @requires Link - DAT/IPFS link management
 * @requires Me - User identity and storage
 * @requires Items - Content item management
 */
window.Pix8 = {
  /**
   * Initializes the Pix8 application with UI components and event handlers
   * @param {Object} cfg - Configuration options for initialization
   */
  init: function(cfg){
    cfg = $.extend({

    }, cfg);

    var t = this;

    this.words_link = Me.link+'words';
    this.sites_link = Me.link+'sites';

    if($('#pic').length) return;

    var $pic = Pix.$pic = Pix8.$pic = Pix8.$cont = $("<div>", {id: 'pic', class: 'bar'}).prependTo('body');

    var $header = Pix8.$header = $("<div>", {id: 'pix8-header'}).prependTo($pic);
    var $title = $("<div>", {id: 'pic8-title'}).appendTo($header);
    var $url = $('<input>', {placeholder: 'URL', id: 'pix8-url'}).appendTo($title);
    $url.bindEnter(function(ev){
      Pix8.onSite(this.value);
    })

    $url.keyup(function(ev){f
      t.search(''+this.value);
    }).blur(ev => {

    });

    Pix8.initInput();

    Pix8.initCarousel();

    Pix8.initList();
    if(window.isElectron){
      Pix8.iniElectron();
      Pix8.initBrowser();
    }

    //Pix8.initGgif();

    Pix8.resize();
  },

	/**
	 * Handles window and layout resizing
	 * Adjusts page heights, body margins, and carousel layouts
	 * Called when carousels are added/removed or window size changes
	 */
	resize: function(){
    if(this.$pic.css('position') == 'fixed')

    if($('#content').is(':visible'))
      Pix.leaveGap();

    var height = $('#pic').height();

    // Adjust page elements when visible
    if($('.page').is(':visible')){
      $('.page').height(window.innerHeight - height);
      $('body').css('margin-top', height);
    }

    return;
		// Legacy code: Calculate total height of visible elements
		var height = $('#pic').height();

    var h = 0;
    $('#pic > *:visible').each(function(){
      console.log($(this).css('position'));
      if($(this).css('position') != 'absolute')
        h += $(this).height();
    });
    $('#pic').height(h);
	},

  /**
   * Initializes the main site carousel
   * Creates the primary carousel for displaying site-related images
   */
  initCarousel(){
    var carousel = this.carousel = new Carousel({
			name: 'main site',
			onAdd: function(url, $thumb){
				carousel.include(url, $thumb); // Handle image additions
			},
			preloadLocal: false,
			preloadGoogle: false
		});

		// Insert carousel after header
		carousel.$t.insertAfter('#pix8-header');

    this.onSite(); // Load current site content

		Pix8.resize();
  },

  /**
   * Domains that act as URL preloaders/proxies
   */
  preloader_domains: ['preload.lh', 'io.cx', 'th.ai', 'm', 'm8'],

  /**
   * Extracts the actual URL from the current location
   * Handles special preloader domains and converts paths to Wikipedia URLs
   * @returns {string} The processed URL
   */
  getUrl(){
    var url = document.location.href;

    var loc = document.location;

    // Handle file:// protocol
    if(url.indexOf('file://') === 0){
      url = Cfg.default_site;
    }else
    // Handle preloader domains that encode URLs in paths
    if(this.preloader_domains.indexOf(loc.hostname) + 1){
    	let uri = document.location.pathname.replace(/^\/+|[^A-Za-z0-9_.:\/~ @-]|\/+$/g, '');
    	var p = uri.split(/[\/]+/);
      var word = p.shift();

      // Reconstruct full URLs
      if(word == 'http' || word == 'https')
        url = word+'://'+p.join('/');
      else
      // Convert single words to Wikipedia URLs
      if(!p[0]){
        var wword = word.charAt(0).toUpperCase() + word.slice(1);
        url = 'https://en.wikipedia.org/wiki/' + wword;
      }
    }

    return url;
  },

  /**
   * Initializes GGIF (enhanced GIF) iframe for media creation
   * Creates full-page iframe for GIF creation interface
   */
  initGgif(){
    var $iframe = $('<iframe>', {id: 'ggif', class: 'page'});
    $iframe.appendTo('body');
  },

  /**
   * Initializes browser window iframe for Electron app
   * Creates embedded browser for site navigation
   */
  initBrowser(){
    var $browser = this.$browser = $('<iframe>', {id: 'browser-window'});
    $browser.appendTo('body');

    $browser.load(ev => {
      console.log(ev);
    });
  },

  /**
   * Converts a path/URL into a Link object for data storage
   * Maps different input types to appropriate storage locations
   * @param {string} path - URL, word, or DAT link
   * @returns {Link} Link object for accessing stored data
   */
  getLink(path){
    var url;

		// Direct DAT protocol links
		if(path.indexOf('dat://') == 0)
			url = path;
		else
		// HTTP/HTTPS URLs
		if(path.indexOf('http://') == 0 || path.indexOf('https://') == 0){
			var site = Pix8.sites[path];

      // Wikipedia URLs → word collections
      var s = '/wiki/';
      if(path.indexOf(s)+1){
        var word = path.substr(path.indexOf(s) + s.length).split('/')[0].toLowerCase();
    		url = App.home_link + 'words/' + word + '.yaml';
      }
      else
			// Known sites → direct link
			if(site)
				url = site;
			else
				// Unknown sites → MD5 hash filename
				url = App.home_link + 'sites/' + md5(path) + '.yaml';
		}else{
			// Plain text → word collection
			url = App.home_link + 'words/' + path + '.yaml';
    }

		var link = new Link(url);
		return link;
  },

  /**
   * Creates a search index for words and sites using ElasticLunr
   * Indexes both word collections and site metadata for fast searching
   */
  createIndex: function(){
    var $cont = this.$search = $('<div>', {id: 'pix8list-search'}).appendTo(this.$Pix8list);

    // Initialize search index with fields
    var index = this.index = elasticlunr(function(){
      this.addField('title');
      this.addField('url');
      this.addField('word');
      this.setRef('ref');
      this.saveDocument(false);
    });

    // Index word collections
    var link = new Link(this.words_link);
    link.list(items => {
      (items || []).forEach(name => {
        var word = name.split('.')[0];

        index.addDoc({
          word,
          ref: word
        });
      });

      // Index site collections
      var sites = [];
      var link = new Link(this.sites_link);
      link.list(list => {
        list.forEach(name => {
        	var url = Pix8.sites_link + '/' + name;
        	sites.push(url);
        });

        // Load and index site metadata
        Items.load(sites).then(items => {
          items.forEach(item => {
            item.ref = Pix8.sites_link + '/' + md5(item.url) + '.yaml';
            index.addDoc(item);
          });
        });
      });

    });
  },

  /**
   * Searches the index and displays results in the side panel
   * @param {string} q - Search query string
   */
  search: function(q){
    // Auto-open menu if hidden
    if(this.$Pix8list.is(':hidden')){
      $('#pic8-openMenu').click();
    }

    if(!this.index) return;

    var found = this.index.search(q);

    // Display search results
    this.$search.empty();
    found.forEach(rez => {
      var item = (rez.ref.indexOf('://')+1)?Items[rez.ref]:{word: rez.ref}
      var $item = $('<a>', {title: item.url});
      this.$search.append($item);
      $item.text(item.title || item.url || item.word);
      $item.data(item);
      $item.click(ev => Pix8.clickResult(ev));
    });
  },

  /**
   * Handles clicks on search results
   * Routes to appropriate handler based on result type (site or word)
   * @param {Event} ev - Click event
   */
  clickResult: function(ev){
    var item = $(ev.target).data();

    this.$Pix8list.hide();

    // Handle site results
    if(item.url){
      this.onSite(item.url);
      return;
    }

    // Handle word results - create new carousel
    if(item.word){
      var carousel = new Carousel({
        name: item.word
      });

      var $carouselLast = $('#pic > .carousel').last();

      carousel.$t.insertAfter($carouselLast[0] || $('#pix8-header'));
      carousel.load(item.word);
      Pix8.resize();
    }
  },

  /**
   * Handles site loading completion in browser iframe
   * Extracts site metadata and associates with carousel
   * @param {Object} site - Site object with metadata
   */
  siteLoaded: function(site){
    var url = ev.target.document.src;
    var link = new Link(this.sites_link+md5(url)+'.yaml');
    this.link.load(item => {
      if(item){
        this.carousel.link = link;
        this.carousel.loadView(item);
      } else{
        // Create new site metadata
        var item = {
          url,
          type: 'site',
          title: ev.target.document.title
        };
      }
    });
  },

  /**
   * Initializes the main input field for tags/URLs and drag-resize functionality
   * Creates the input area at the bottom of the interface
   */
  initInput: function(){
    var $resize = this.$resize = $("<div id='pic-resize'></div>");
    $resize.appendTo(Pix8.$pic);

    var t = this;
    var $tag = Pix.$tag = Pix8.$tag = $("<input id='pic-tag'/>").appendTo($resize);

    // Focus/blur styling
    $tag.focus(ev => {
      $resize.addClass('focus');
    }).blur(ev => {
      $resize.removeClass('focus');
    });

    // Enter key handler
    $tag.bindEnter(function(){
      Pix8.parseTag(this.value);

      return;

      // Legacy: Handle plus commands
      if(this.value[0] == '+'){
        Pix8.onPlus[plus[0]](this.value.substr(this.value.indexOf(':')+1));
        this.value = '';
        return;
      }

      // Handle URLs
      if(
        this.value.indexOf('http://') == 0 ||
        this.value.indexOf('https://') == 0
      ) {
        Pix8.onSite(this.value);
      }

      // Create new carousel for input
      var carousel = new Carousel({});

      carousel.$t.insertBefore(t.$resize);
      Pix8.resize();

      var link = Link(this.value);
      carousel.laylink(link);

      this.value = '';

      // Legacy: Auto-resize in Electron
      if(false && window.isElectron)
        window.resizeBy(0, carousel.$t.height())
    }).click(function(){
      $tag.focus();
    });

    this.enableInputDrag();
  },



  /**
   * Handles navigation to a website/URL
   * Loads site data into the main carousel and updates UI
   * @param {string} url - URL to navigate to
   */
  onSite(url){
    var link = Link(url);
    this.carousel.laylink(link);

    return;

    // Legacy implementation:
    var link = Link(url);
    var carousel = this.carousel;

    link.load(item => {
      $('#pix8-url').val(url);
      $('#browser-window').attr('src', url);
      carousel.link = link;

      if(item){
        carousel.load(item);
      }
      else{
        // Create new site item
        item = {
          url,
          owner: Me.link,
      		time: (new Date()).getTime()
        }

        link.save(item).then(r => {
          carousel.load(item);
        });
      }
    });
  },

  /**
   * Parses user input and creates appropriate carousel
   * Handles URLs, words, and other tag types
   * @param {string} url - User input to parse
   */
  parseTag(url){
    var carousel = new Carousel({});

    carousel.$t.insertBefore(this.$resize);
    Pix8.resize();

    var link = Link(url);
    carousel.laylink(link);
  },

  /**
   * Registry for plus command handlers (+command:value)
   */
  onPlus: {},

  /**
   * Registers a handler for plus commands
   * @param {string} handler - Command name
   * @param {Function} cb - Callback function
   */
  regPlus: function(handler, cb){
    this.onPlus[handler] = cb;
  },

  /**
   * Initializes Electron-specific window controls
   * Adds dev tools, minimize, and close buttons to header
   */
  iniElectron: function(){
    var window = require('electron').remote.getCurrentWindow();

    // Dev Tools button (<>)
    $("<button>", {id: 'pic8-devTools'}).click(ev => {
      window.toggleDevTools();
    }).html('&lt;&gt;').appendTo(Pix8.$header);

    // Minimize button (-)
    $("<button>", {id: 'pic8-minimize'}).click(ev => {
      window.minimize();
    }).html('&minus;').appendTo(Pix8.$header);

    // Close button (×)
    $("<button>", {id: 'pic8-close'}).click(ev => {
      window.close();
    }).html('&#10005;').appendTo(Pix8.$header);
  },

  /**
   * Enables drag-to-resize functionality on the input field
   * Allows users to resize carousel heights and adjust scroll positions
   */
  enableInputDrag: function(){
    var $pic = Pix8.$pic;
    jQuery.event.special.drag.defaults.not = '';

    this.$tag.drag("start", function(ev, dd){
    	// Store initial state
    	dd.height = parseInt($('#pic').height());
    	var $carousel = Pix8.$pic.children('.carousel').last();
    	dd.carouselHeight = $carousel.height();
    	dd.left = $carousel[0].scrollLeft;
    	dd.clientX = ev.clientX;
    	dd.done = 0;
    }, {click: true}).drag(function(ev, dd){
    	var onTop = !($pic.css('top') == 'auto'),
    			delta = dd.deltaY * (onTop?1:(-1));

    	// Calculate incremental change
    	var dif = dd.deltaY - dd.done;
    	dd.done = dd.deltaY;

    	var $carousel = $pic.children('.carousel').last();
      if(!$carousel.length) return;

      var carousel = $carousel[0].carousel;

    	// Resize carousel height
    	var height = $carousel.height() + dif;
    	if(height){
    		$carousel.height(height);
    		carousel.resize();
    	}
    	else
    		// Remove carousel if height becomes 0
    		carousel.$t.remove();

    	// Adjust scroll position proportionally
    	var newL = (dd.left + dd.clientX) * carousel.$t.height() / dd.carouselHeight,
    		dif = newL - dd.left - dd.clientX;
    	carousel.t.scrollLeft = dd.left + dif;
    }).drag("end", function(ev, dd){
    	Pix8.resize();
    });
  },

  /**
   * Logs site navigation activity to user's activity log
   * @param {string} link - Site link identifier
   * @param {string} site - Site URL or identifier
   */
  logSite: function(link, site){
    if(!view.path) return;
    if(view.path.indexOf('file://') + 1) return; // Skip file:// URLs

    (new Link(Me.link)).log(link +' '+ site);
  },

  /**
   * Initializes the side panel/menu system
   * Creates the toggleable list for words, sites, and search
   */
  initList: function(){
    var $cont = this.$Pix8list = $('<div>', {id: 'pix8list'}).appendTo('#pic');

    // Menu toggle button (≡)
    $("<button>", {id: 'pic8-openMenu'}).click(ev => {
      $cont.toggle();

      // Lazy initialization on first open
      if(!Pix8.initiated){
        //this.createIndex();
        //this.initWords();
        this.initSites();
        Pix8.initiated = true;
      }
    }).html("&#8803").prependTo(Pix8.$header);

  },
  /**
   * Flag to track if side panel has been initialized
   */
  initiated: false,

  /**
   * Initializes the words section of the side panel
   * Creates container and loads user's word collections
   */
  initWords: function(){
    var $cont = this.$Pix8list_words = $('<div>', {id: 'pix8list_words'}).appendTo(this.$Pix8list);

    Pix8.loadWords();
  },

  /**
   * Initializes the sites section of the side panel
   * Creates container for site history and bookmarks
   */
  initSites: function(){
    var $cont = this.$Pix8list_sites = $('<div>', {id: 'pix8list_sites'}).appendTo(this.$Pix8list);

    return;
    // Legacy: Load sites from storage
    this.sites_link.load(item => {
      if(item && item.length){
        item.forEach(line => {
          var l = line.split(' ');
          Pix8.addSite(l[0]);
        });
      }
    });
  },

  /**
   * Adds a site to the sites list with associated link
   * @param {string} link - Storage link for site data
   * @param {string} url - Site URL
   * @returns {jQuery} Created site element
   */
  addSite: function(link, url){
    this.sites[url] = link;

    var $item = $('<a>', {href: text});
    $item.text(text).data({id, text});
    $item.click(ev => Pix8.clickTag(ev));
    $('#pix8list_sites').prepend($item);
    return $item;
  },

  // Data storage objects
  sites: {},  // Site URL to link mappings
  words: {},  // Word collections cache
  items: {},  // Loaded items cache

  /**
   * Loads and displays user's word collections
   * Fetches list from DAT storage and creates clickable tags
   * @param {string} id - Optional specific word ID to load
   */
  loadWords: function(id){
    var link = new Link(this.words_link);

    link.list(items => {
      (items || []).forEach(name => {
        var word = name.split('.')[0]; // Remove .yaml extension

        Pix8.addTag(word);
      });

      Pix8.resize();
    });
  },

  /**
   * Adds a word tag to the words list
   * @param {string} word - Word to add as clickable tag
   */
  addTag: function(word){
    var $item = this.buildTag(word);
    $('#pix8list_words').prepend($item);
  },

  /**
   * Creates a clickable tag element for a word
   * @param {string} word - Word to create tag for
   * @returns {jQuery} Clickable tag element
   */
  buildTag: function(word){
    var $item = $('<a>');
    $item.text(word);
    $item.click(ev => Pix8.clickTag(ev));
    return $item;
  },

  /**
   * Handles clicks on word/site tags in the side panel
   * Creates new carousel for the selected item
   * @param {Event} ev - Click event
   */
  clickTag: function(ev){
    ev.preventDefault();

    var text = $(ev.target).text();

    var carousel = new Carousel({
      name: text,
    });

    this.$Pix8list.hide();

  	// Insert after last carousel or header
  	var $carouselLast = $('#pic > .carousel').last();

    carousel.$t.insertAfter($carouselLast[0] || $('#pix8-header'));
    carousel.load(text);
    Pix8.resize();

    // Update URL field if it's a URL
    if(text.indexOf('http') == 0)
      $('#pix8-url').val(text);
  },

  /**
   * Adds a new word to the user's collection
   * TODO: Implementation needed
   */
  addWord: function(){
    // Implementation placeholder
  }
};

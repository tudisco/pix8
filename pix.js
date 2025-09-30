/**
 * Pix - Core image management library for pix8 application
 * Provides carousel functionality, image loading, tagging, and data synchronization
 * Supports Chrome Extension, Electron, and Web platforms
 */
var pix = Pix = {
	// Supported image file extensions
	exts: ['jpg', 'jpeg', 'gif', 'png', 'JPG', 'GIF', 'PNG', 'JPGEG'],

	// Default thumbnail height in pixels
	thumbH: 200,

	// Drag state flag for drag-and-drop operations
	drag: false,

	// Default namespace identifier
	def: 'pix8',

	// Callbacks to execute when application is ready
	ready: [],

	// Callbacks to execute when session is established
	onSession: [],

	// Template/theme ID
	tid: 449,

	// API endpoint for server communication (production)
	api: '2.pix8.co:25286/',
	//api: 'localhost:25286/', // Local development endpoint

	// External thumbnail generation service URL
	thumber: 'http://io.cx/thumb/',

	/**
	 * Height percentages for carousel layouts
	 * Key = number of visible carousels
	 * Value = array of height percentages (should sum to 100)
	 */
	heights: {
		1: [100],
		2: [70,30],
		3: [50,30,20],
		4: [45,28,17,10],
		//5: [42,26,16,10,6],
		//6: [40,25,15,10,6,4]
	},

	/**
	 * Generate Fibonacci-like sequence starting with a, b until sum >= 100
	 * Used for proportional layout calculations (golden ratio inspired)
	 * @param {number} a - First number in sequence
	 * @param {number} b - Second number in sequence
	 * @returns {Array<number>} Sequence array
	 */
	phi: function(a, b){
		var s = [a, b];
		while(s.reduce(function(pv, cv) { return pv + cv; }, 0)<100){
			s.push(parseInt(s.slice(-1)) + parseInt(s.slice(-2, -1)))
		};

		return s;
	},

	// Array of already initialized carousel instances
	carousels: [],

	// Cache of jQuery-wrapped thumbnail DOM elements, indexed by item ID
	$items: {},

	// Item data cache from database (id => item object)
	items: window.Data?Data.items:{},

	/**
	 * Build a thumbnail DOM element for an item
	 * Handles images, YouTube videos, ggif.co iframes, and local files
	 * @param {Object|string} d - Item data object or URL string
	 * @param {string} d.src - Source URL of the item
	 * @param {string} d.file - Local file identifier
	 * @param {number} d.id - Unique item ID
	 * @param {string} d.text - Optional text overlay
	 * @returns {jQuery} Thumbnail span element
	 */
	build: function(d){
		// Normalize input: convert string URL to object
		if(typeof d == 'string')
			d = {src: d};

		// Build full file URL from file identifier
		if(d.file && !d.src)
			d.src = Cfg.files+d.file

		// Extract file identifier from full URL if present
		var file = d.file;
		if(!file && d.src){
			if(d.src.indexOf(Cfg.files) === 0)
				file = d.src.substr(Cfg.files.length);
		}

		var url = d.src;
		var t = this,
			$thumb = $(document.createElement('span'));

		// Store item data in DOM element for later retrieval
		$thumb.data(d);
		console.log(d);
		$thumb.attr('title', d.id);

		// Parse video URLs (YouTube, Vimeo) if present
		if(d.src){
			var video = pix.parseVideoURL(d.src),
				vid = video.provider;
		}

		// YouTube video embed
		if(video && video.provider == 'youtube'){
			var thumb = 'http://img.youtube.com/vi/'+video.id+'/sddefault.jpg';

			var frame = document.createElement("iframe");
				frame.src = 'http://www.youtube.com/embed/'+video.id;
			$thumb.addClass('youtube').append(frame);
			// Cover div prevents iframe from capturing mouse events during drag
			$thumb.append("<div class='iframe-cover'></div>");
		}
		else
		// ggif.co animated GIF embed (iframe from ggif website)
		if(url && url.indexOf('ggif.co')+1){
			var p = url.replace('http://', '').split(/[\/]+/);
			//var thumb = 'http://'+p[0]+'/'+p[1]+'/'+p[1]+'.gif';

			var frame = document.createElement("iframe");
			// Resize carousel when iframe loads successfully
			frame.onload = function(){
				var $carousel = $thumb.parent();
				if($carousel.length){
					var carousel = $carousel[0].carousel;
					carousel.resize($thumb);
				}
			}
			// Clean up if iframe fails to load
			frame.onerror = function(){
				$thumb.parent().children('span[href="'+url+'"]').remove();
				var $carousel = $thumb.parent();
				if($carousel.length)
					$carousel[0].expand();

				pix.cleanTargets();
			}
				//frame.width = h;
				//frame.height = h;
				frame.src = url.replace('http://', 'https://'); // Upgrade to HTTPS
			$thumb.addClass('ggif').append(frame);
			$thumb.append("<div class='iframe-cover'></div>");
		}
		else
		// Local file from server
		if(file){
			$thumb.addClass('file');
			carousel.resize($thumb);
			$thumb.css({'background-image': "url("+Cfg.thumber+url.replace('://', '/')+")"});
			Pix.loadFile(file, $thumb);
		}
		else{
			// Regular image URL
			var image = new Image;
			image.onload = function(){
				console.log(image.src);
				var $thumbs = $thumb.parent().children('span[href="'+url+'"]');
				$thumbs.css('background-image', ''); // Clear loading background

				var $carousel = $thumb.parent();
				if($carousel.length){
					var carousel = $carousel[0].carousel;
					carousel.resize($thumb);
				}
			}
			// Remove thumbnail if image fails to load
			image.onerror = function(){
				var $thumbs = $thumb.parent().children('span[href="'+url+'"]');

				/*
				if(image.src.indexOf(Local.api)+1)
					return $thumbs.children('img').attr('src', thumb || url);
				*/

				$thumbs.remove();

				var $carousel = $thumb.parent();

				pix.cleanTargets();
			}

			var name = url.split(/(\\|\/)/g).pop();
			image.src = carousel.formatUrl(url);

			image.alt = thumb || url;

			$thumb.append(image);
		}

		// Set element attributes
		$thumb.attr({
			href: d.href || url,
			name: 'item'+d.id
		});

		$thumb.addClass('thumb');

		// Add text overlay if provided
		if(d.text)
			pix.appendText(d.text, $thumb);

		// Add hidden notification div for future use
		$("<div class='n'></div>").appendTo($thumb).hide();

		// Cache the jQuery element
		pix.$items[d.id] = $thumb;

		return $thumb;
	},

	/**
	 * Create a new carousel instance
	 * @param {string} tag - Tag filter for carousel content
	 */
	carousel: function(tag){
		var carousel = new Carousel({
			name: 'site images',
			onAdd: function(url, $thumb){
				carousel.include(url, $thumb);
			},
			preloadLocal: false,
			preloadGoogle: false
		});

		carousel.$t.appendTo(Pix.$pic);
		carousel.onTag(tag);
	},

	/**
	 * Placeholder for tag-based filtering callback
	 */
	onTag: function(){

	},

	/**
	 * Alternative build method using Elem class
	 * @param {Object} item - Item data
	 * @returns {jQuery} Built item element
	 */
	build: item => {
		var elem = new Elem(item);
		return elem.$item;
	},

	/**
	 * Load a file and render it as an animated GIF if applicable
	 * Uses custom Gif class to parse and play GIF frames
	 * @param {string} fid - File identifier
	 * @param {jQuery} $thumb - Thumbnail element to populate
	 */
	loadFile: function(fid, $thumb){
		var image = new Image;
		image.onload = function(){
			$thumb.append(image);
			carousel.resize($thumb);

			// Parse GIF and create canvas-based player
			var gif = new Gif(image.src, () => {
				if(!gif.segments)
					return;

				// Replace static image with canvas player
				$(image).remove();

				var carousel = $thumb.parent()[0].carousel;
				$thumb.append(gif.canvas);
				carousel.resize($thumb);
				gif.fade = true;
				// Click to play GIF with sound
				$(gif.canvas).click(function(){
					gif.audio.volume = 1;
					gif.play(0);
				});
			});

			$thumb.append(image);
		};

		image.src = Cfg.files + fid;
	},

	/**
	 * Pause all playing animated GIFs in the carousel area
	 */
	stopGgifs: () => {
		$('#pic canvas.gif').each(function(){
			var gif = this.gif;
			if(!gif) return;

			gif.pause();
		});
	},

	/**
	 * Send command to server via WebSocket or Chrome extension
	 * Supports offline mode with IndexedDB caching (dbz)
	 * @param {Object} m - Message object with cmd, filter, collection, etc.
	 * @param {Function} cb - Callback function receiving response
	 */
	send: function(m, cb){
		if(typeof ws != "undefined" && ws instanceof WS){
			console.log(m);
			// Online mode - direct WebSocket communication
			if(!window.dbz){
				ws.send(m, r => cb(r));
			}
			else
			// Offline mode with IndexedDB - handle update commands
			if(m.cmd == 'update' && m.set && m.id){
				let collection = dbz.collection(m.collection);
				collection.update({id: m.id}, m.set);

				// Sync with server if session exists
				if(Pix.session)
					ws.send(m, r => {
						collection.insert(r.items || r.item).then(r => console.log(r));
						cb(r);
						console.log(r);
					});
			}
			else
			// Offline mode - handle get/load commands with local cache
			if(
				(m.cmd == 'get' || m.cmd == 'load') &&
				m.filter && m.collection
			){
				let collection = dbz.collection(m.collection);
				collection.find(m.filter).toArray((err, items) => {
					console.log(items);

					let send = () => {
						ws.send(m, r => {
							collection.insert(r.items || r.item).then(r => console.log(r));
							cb(r);
							console.log(r);
						});
					}

					// Return cached data if available
					if(items && items.length){
						if(m.cmd == 'get') cb({item: items[0]});
						else cb({items});
					}
					else
					// Fetch from server if no cache
					if(pix.session)
						send();
					else
					Pix.onSession.push(ses => {
						send();
					});
				});
			}
			else
			// Other commands - wait for session if needed
			if(Pix.session)
				ws.send(m, r => cb(r));
			else
				Pix.onSession.push(ses => {
					ws.send(m, r => cb(r));
				});
		}
		else
		// Chrome extension mode - send via runtime messaging
		if(chrome && chrome.runtime)
			chrome.runtime.sendMessage({cmd: 'ws', d: m}, cb);
		else
			console.error('No way to interact with server');

	},

	/**
	 * Download a file (currently incomplete implementation)
	 * @param {number} id - File ID to download
	 * @param {Function} cb - Callback function
	 */
	download: function(id, cb){
		var x = new XMLHttpRequest();
		x.open('GET', blobchromeextensionurlhere);
		x.responseType = 'blob';
		x.onload = function() {
		    var url = URL.createObjectURL(x.response);
		    // Example: blob:http%3A//example.com/17e9d36c-f5cd-48e6-b6b9-589890de1d23
		    // Now pass url to the page, e.g. using postMessage
		};
		x.send();
		return;

		if(typeof ws != "undefined" && ws instanceof WS)
			ws.download(id, cb);
		else
		if(chrome && chrome.runtime)
			chrome.runtime.sendMessage({cmd: 'download', id: id}, function(r){
				console.log(URL.revokeObjectURL(r));
			});
		else
			console.error('No way to interact with server');
	},

	/**
	 * Add text overlay to a thumbnail element
	 * @param {string} text - Text content to display
	 * @param {jQuery} $thumb - Thumbnail element
	 * @returns {jQuery} Article element containing text
	 */
	appendText: function(text, $thumb){
		var $article = $thumb.children('article');
		if(!$article.length)
			$article = $('<article></article>').prependTo($thumb);

		$article.text(text);

		return $article;
	},


	files: [],
	listFiles: function(cb){
		var t = this;
		return;
		chrome.runtime.sendMessage({cmd: 'files'}, function(r){
			t.files = r.files || [];
			cb(r.files);
		});
	},

	// Google Custom Search API endpoint for image search
	gImages: 'https://www.googleapis.com/customsearch/v1?key=AIzaSyCG9TzinRXo42CrGCYiOBh9pOV-MXrbdL4&&cx=005276605350744041336:wifcwjx3hiw&searchType=image&q=',

	/**
	 * Search Google Images using Custom Search API
	 * @param {string} q - Search query
	 * @param {Function} cb - Callback receiving array of image URLs
	 */
	searchGoogle: function(q, cb){
		console.log('searchGoogle' + q);
		$.getJSON(pix.gImages+q, function(r){
			var images  = [];
			if(r && r.items)
				r.items.forEach(function(item){
					if(item.link)
						images.push(item.link);
				});

			if(images.length)
				cb(images);
		})
	},

	/**
	 * Preload items from database by IDs
	 * Only fetches items not already in cache
	 * @param {Array<number>} ids - Array of item IDs to preload
	 * @returns {Promise} Resolves when all items are loaded
	 */
	preload: function(ids){
		var newIds = [];
		ids.forEach(function(id){
			if(!Pix.items[id])
				newIds.push(id);
		});

		return new Promise(function(resolve, reject){
			if(newIds.length)
				Pix.send({
					cmd: 'load',
					filter: {
						id: {$in: newIds},
					},
					collection: Cfg.collection
				}, function(r){
					(r.items || []).forEach(function(item){
						Pix.items[item.id] = item;
					});

					resolve();
				});
			else
				resolve();
		});
	},

	/**
	 * Clean up orphaned drag-drop targets
	 * Fixes dubmedia drag&drop bug by removing targets with no parent
	 */
	cleanTargets: function(){
		var targets = $.event.special.drop.targets;
		for(var i = targets.length-1; i--;){
			if(targets[i] && !targets[i].parentElement) targets.splice(i, 1);
		}
	},

	/**
	 * Remove all thumbnails with a specific URL from carousels
	 * @param {string} url - URL to match and remove
	 */
	cleanByUrl: function(url){
		$("#carousels span[href='"+url+"']").remove();
	},

	// Animation easing functions
	anim: {
		/**
		 * Exponential ease-out animation curve
		 * @param {number} currentIteration - Current step in animation
		 * @param {number} startValue - Starting value
		 * @param {number} changeInValue - Total change in value
		 * @param {number} totalIterations - Total animation steps
		 * @returns {number} Interpolated value
		 */
		easeOutExpo: function(currentIteration, startValue, changeInValue, totalIterations){
			return changeInValue * (-Math.pow(2, -10 * currentIteration / totalIterations) + 1) + startValue;
		}
	},

	/**
	 * Parse video URL and extract provider and video ID
	 * Supports YouTube and Vimeo
	 * @param {string} url - Video URL
	 * @returns {Object} Object with provider and id properties, or empty object
	 */
	parseVideoURL: function(url){
		if(typeof url !== 'string') return;
	 	function getParm(url, base){
		      var re = new RegExp("(\\?|&)" + base + "\\=([^&]*)(&|$)");
		      var matches = url.match(re);
		      if (matches) {
		          return(matches[2]);
		      } else {
		          return("");
		      }
		  }

		  var retVal = {};
		  var matches;
		  var success = false;

		  if(url.match('http(s)?://(www.)?youtube|youtu\.be') ){
		    if (url.match('embed')) { retVal.id = url.split(/embed\//)[1].split('"')[0]; }
		      else { retVal.id = url.split(/v\/|v=|youtu\.be\//)[1].split(/[?&]/)[0]; }
		      retVal.provider = "youtube";
		      var videoUrl = 'https://www.youtube.com/embed/' + retVal.id + '?rel=0';
		      success = true;
		  } else if (matches = url.match(/vimeo.com\/(\d+)/)) {
		      retVal.provider = "vimeo";
		      retVal.id = matches[1];
		      var videoUrl = 'http://player.vimeo.com/video/' + retVal.id;
		      success = true;
		  }

		 return retVal;
	},

	/**
	 * Parse and normalize URL, extracting actual image URL from query strings
	 * Useful for Google Images URLs that contain imgurl parameter
	 * @param {string} url - URL to parse
	 * @returns {string} Extracted or original URL
	 */
	parseURL: function(url){
		var qs = parseQS(decodeURIComponent(url));
		if(qs && qs.imgurl)
			url = qs.imgurl;

		return url;
	},

	/**
	 * Count visible carousels and store in pix.visible
	 */
	checkVisible: function(){
		pix.visible = $('#carousels > .carousel:visible').length;
	},

	/**
	 * Extract and normalize pathname from current URL
	 * @param {string} hash - Unused parameter (legacy)
	 * @returns {string} Normalized pathname
	 */
	checkPath: function(hash){
		return hash = window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase() || '';
	},

	/**
	 * Get current hash from URL without # prefix
	 * @returns {string} Hash value
	 */
	hash: function(){
		return location.hash.replace('#','').replace(/^\/|\/$/g, '');
	},

	/**
	 * Load and display public depictions/views matching search criteria
	 * @param {string} search - Search regex pattern (optional)
	 */
	loadDepictions: function(search){
		Pix.send({
			cmd: 'load',
			filter: {
				type: 'public',
				path: { $regex: (search || ''), $options: 'i' }
			},
			sort: {
				updated: -1
			},
			collection: 'views'
		},
		function(r){
			var $list = $('#depictions').empty();
			UI.side('#depictions');

			(r.items || []).forEach(function(item){
				var $item = $("<a href='#"+item.path+"'>"+item.path+"</a>");
				$item.data(item);

				$list.append($item);
			});
		});
	},

	/**
	 * Collect all active stream objects from DOM
	 * @returns {Array} Array of stream objects
	 */
	streams: function(){
		var streams = [];
		$('#streams > .stream').each(function(){
			streams.push(this.stream);
		});
		return streams;
	},

	/**
	 * Called when page loads - handles authentication or loads default view
	 */
	onLoad: function(){
		if(pix.authData)
			pix.onAuth(pix.authData);
		else
			pix.loadView();
	},

	// Array tracking which views have been loaded
	loaded: [],

	/**
	 * Default view structure for new/empty views
	 * Contains empty carousels with different rates and capacities
	 */
	defaultView: {
		id: -1,
		items: [],
		carousels: [
			{items:[], rate: 4, num: 2},
			{items:[], rate: 3, num: 4},
			{items:[], rate: 2, num: 8},
			{items:[], rate: 1, num: 16}
		]
	},

	/**
	 * Find all item IDs in cache not currently displayed in carousels
	 * @returns {Array<number>} Array of unused item IDs
	 */
	unusedIds: function(){
		var ids = [];
		for(var id in pix.items){
			if(!$('#carousels span[name=item'+id+']').length){
		    	ids.push(parseInt(id));
			}
		};
		return ids;
	},

	/**
	 * Handle user authentication, update UI with user info
	 * @param {Object} auth - Authentication data object
	 * @param {string} auth.username - Username
	 * @param {Object} auth.twitter - Twitter profile data (optional)
	 */
	onAuth: function(auth){
		if(!auth) return;

		var name = auth.username || auth.name || '';
		if(auth.twitter){
			name = auth.twitter.displayName;
			$('#acc-img').css('background-image', 'url('+auth.twitter.profileImageURL+')');
		}

		pix.auth = auth;

		$('#acc').show();
		$('#acc-name').text(name);
		$('#auth').hide();

		var $v = $("#my-stream > .stream-views > a[name='"+pix.auth.username+"']");
		if($v.length) $v.click();
	},

	/**
	 * Make an item the first item in current user's view
	 * @param {number} id - Item ID to make first
	 */
	makeMyFirst: function(id){
		var username = $('#acc-name').text();
		if(!username || typeof id != 'number') return;

		Pix.send({
			cmd: 'get',
			filter: {
				path: pix.path,
				username: username
			},
			collection: 'views'
		}, function(r){
			console.log(r.item);
			if(r && r.item){
				Pix.send({
					cmd: 'makeFirst',
					idView: r.item.id,
					idItem: id
				});
			}
		});
	},

	/**
	 * Resize carousel container (currently disabled)
	 * @param {number} newH - New height in pixels
	 */
	resize: function(newH){
		return;
		var newH = Math.min(Math.max(30, newH || Pix.$pic.height()), 800);

		var h = 0;
		Pix.$pic.children('.carousel:not(:last)').each(function(){
			h += $(this).height();
		});

		var carousel_last = Pix.$pic.children('.carousel').last()[0].carousel;
		carousel_last.$t.height(newH - h);
		carousel_last.resize();

		$('#pic').height(newH);

		if(!carousel_last.$t.height())
			carousel_last.$t.remove();
	},

	/**
	 * Build a tag/hash switch UI element (legacy)
	 * @returns {jQuery} Switch element
	 */
	buildSwitch: function(){
		var $switch = $("<div class='switch'>"+
			"<input class='switch-hash' name='hash' value='hashTag'/>"+
		"</div>");

		return $switch;
	},

	// jQuery collection of fixed/absolute positioned elements
	$fixed: $(),

	/**
	 * Collect all fixed and absolute positioned elements on page
	 * Stores original top positions for layout adjustments
	 */
	collectFixed: function(){
		var $fixed = Pix.$fixed = $('*').filter(function(){
			var $el = $(this);
			var position = $el.css('position');
			var ok = ((
					(position === 'absolute' && !Pix.isRelative($el)) ||
					position === 'fixed'
				) &&
				this.id != 'pic' &&
				!$el.hasClass('carousel-tag') &&
				!isNaN(parseInt($el.css('top')))
			);
			if(ok) $el.data('_pix8-top', parseInt($el.css('top')));
			return ok;
		});

		Pix.marginBody = parseInt($('body').css('margin-top')) || 0;
	},

	/**
	 * Check if element has relatively positioned parent
	 * @param {jQuery} $el - Element to check
	 * @returns {boolean} True if has relative/fixed/absolute parent
	 */
	isRelative: function($el){
		var y = false;
		$el.parents().each(function(){
			if(['relative', 'fixed', 'absolute'].indexOf($(this).css('position'))+1)
				y = true;
		});

		return y;
	},

	/**
	 * Adjust fixed elements and body margin to leave gap at top
	 * Used to make room for carousel overlay
	 * @param {number} px - Pixels of gap to leave
	 */
	leaveGap: function(px){
		Pix.$fixed.each(function(){
			var $el = $(this);
			$el.css('top', $el.data('_pix8-top') + px);
		});

		$('body').css('margin-top', Pix.marginBody + px);
	},

	/**
	 * Restore fixed elements and body margin to original positions
	 */
	restoreGap: function(){
		if(isNaN(Pix.marginBody)) return;

		Pix.$fixed.each(function(){
			var $el = $(this);
			$el.css('top', $el.data('_pix8-top'));
		});

		$('body').css('margin-top', Pix.marginBody);
	},

	/**
	 * Apply CSS transform to body element (currently unused)
	 * @param {number} px - Pixels to translate vertically
	 */
	transform: function(px){
		/*
		var id = 'pix8-transform';
		if(!$('#'+id).length)
			$('<style>', {id: id}).appendTo('body')
		*/

		$('body').css('tranform', px?('translateY('+px+'px)'):'none');
	},

	/**
	 * Check jQuery version and revert if too old (< v2)
	 */
	checkJquery: function(){
		var version = parseInt(window.jQuery.fn.jquery);
		console.log(version);
		if(version < 2)
			$.noConflict(true);
	},

	/**
	 * Spider utilities for extracting and manipulating image URLs from various sites
	 */
	spider: {
		/**
		 * Get full-resolution image URL from thumbnail or page URL
		 * Supports imgur.com and wikimedia URLs
		 * @param {string} url - Image or page URL
		 * @returns {string} Full resolution image URL
		 */
		getImgUrl: function(url){
			console.log(url);
			if(url.indexOf('imgur.com')+1){
				var parts = url.replace(/^(https?|ftp):\/\//, '').split('/'),
					ext = ''+url.split('.').pop();

				if(['jpg', 'jpeg', 'gif', 'png'].indexOf(ext)+1)
					return url;

				return 'http://i.imgur.com/'+parts[1]+'.jpg';
			}
			else
			if(url.indexOf('upload.wikimedia.org')+1 && url.indexOf('/thumb/')+1){
				var urlA = url.split('/');
				urlA.pop();
				urlA.splice(urlA.indexOf('thumb'), 1);
				url = urlA.join('/');
			}

			return url;
		},

		/**
		 * Scrape all images from a webpage URL
		 * @param {string} url - Page URL to scrape
		 * @returns {Promise<Array<string>>} Promise resolving to array of image URLs
		 */
		getImages: function(url){
			return new Promise(function(resolve, reject){
				$.get(url).done(function(r){
					var $site = $(r);
					var images = [];
					$site.find('img').each(function(){
						var url = Pix.spider.getImgUrl(this.src);
						images.push(url);
					});
					resolve(images)
				}).fail(function(){
					reject();
				});
			});
		}
	}
}

/**
 * Document ready handler - initializes pix8 application
 */
$(function(){
	Pix.checkJquery();

	// Collect fixed elements and adjust layout
	Pix.collectFixed();
	Pix.leaveGap($('#pic').height());

	/**
	 * Keyboard shortcuts for carousel control
	 * 1/numpad1: 10vh carousel height
	 * 2/numpad2: 25vh carousel height
	 * 3/numpad3: 60vh carousel height
	 * 4-6/numpad4-6: Show only first N carousels
	 * ESC: Stop all GIF playback
	 */
	$(document).bind("keydown", function(ev){
		var delAfter = 0;

		if($('input:focus').length) return;
		if(ev.keyCode == 97 || ev.keyCode == 49){
			$('#mainCarousel').css('height', '10vh').siblings('.carousel').remove();
			$('#mainCarousel')[0].carousel.resize();
			if(window.Site) Site.resize();
			else Pix.leaveGap($('#pic').height());
		}
		else
		if(ev.keyCode == 98 || ev.keyCode == 50){
			$('#mainCarousel').css('height', '25vh').siblings('.carousel').remove();
			$('#mainCarousel')[0].carousel.resize();
			if(window.Site) Site.resize();
			else Pix.leaveGap($('#pic').height());
		}
		else
		if(ev.keyCode == 99 || ev.keyCode == 51){
			$('#mainCarousel').css('height', '60vh').siblings('.carousel').remove();
			$('#mainCarousel')[0].carousel.resize();
			if(window.Site) Site.resize();
			else Pix.leaveGap($('#pic').height());
		}
		else
		if(ev.keyCode == 100 || ev.keyCode == 52)
			delAfter = 4;
		else
		if(ev.keyCode == 101 || ev.keyCode == 53)
			delAfter = 5;
		else
		if(ev.keyCode == 102 || ev.keyCode == 54)
			delAfter = 6;
		else
		if(ev.keyCode == 27){
			Pix.stopGgifs();
		}

		if(delAfter && !$('*:focus').length){
			$('#pic > .carousel').slice(delAfter).remove();
			if(typeof Site == 'object')
				Site.resize()
			else
				Pix.leaveGap($('#pic').height());
		}
	});
});

// Enable drag-and-drop mode globally
$.drop({ mode:true });

/**
 * Show iframe cover on mouseleave to re-enable drag functionality
 * Without this, iframes capture mouse events
 */
$(document).on('mouseleave', '.ggif,.youtube', function(ev){
	var carousel = $(ev.currentTarget).parent()[0].carousel;
	//if(carousel.stop)
		$(this).children('.iframe-cover').show();
});

/**
 * Paste handler for adding images/URLs to focused carousel
 * Supports both text URLs and image clipboard data
 */
$(document).bind("paste", ev => {
	// Ignore if typing in input field
	if($('*:focus').length) return;

	var paste = ev.originalEvent.clipboardData.getData('Text') ||
		ev.originalEvent.clipboardData.getData('URL');

	var items = (event.clipboardData || event.originalEvent.clipboardData).items;

	// Find active carousel with focus
	var $activeCarousel = $('#pic > .carousel.focus');
	if(!$activeCarousel.length) return;

	var carousel = $activeCarousel[0].carousel;

	var $focus = $activeCarousel.children('.focus');
	if(!$focus.length) return;

	// Handle image data paste (e.g., screenshots)
	if(!paste && items && items.length)
		return carousel.upload(ev, $focus);

	console.log('Paste: ' + paste);
	// Only process HTTP/HTTPS URLs
	if(paste.indexOf('http')) return;

	carousel.include(paste, $focus);

	ev.preventDefault();
});

/**
 * Additional paste event handler (legacy)
 */
document.onpaste = function(event){
	console.log(event);
}

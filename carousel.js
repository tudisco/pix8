/**
 * Carousel - Horizontal scrolling image carousel with drag-drop, upload, and view management
 * @constructor
 * @param {Object} opt - Configuration options to extend defaults
 */
var Carousel = function(opt){
	// Merge default configuration with provided options
	this.cfg = $.extend(this.cfg, {
		allowPatterns: false,     // Enable infinite pattern scrolling
		down2remove: 0.5,          // Drag down threshold (0.5 = 50% of height)
		takeOffLimit: 5,           // Pixel threshold to start drag
		slideLimit: 10,            // Pixel threshold to register as slide
		infinite: true,            // Enable infinite scrolling
		preloadLocal: true,        // Auto-collect images from current page
		preloadGoogle: true,       // Use Google Image Search for filling
		fetchLimit: 8,             // Max items to fetch when prepending views
	}, opt);

	var name = this.cfg.name;
	// Create main carousel container element
	var $carousel = this.$t = $("<div>", {class: 'carousel bar'});
	this.$t.attr('name', name);
	this.name = name;

	var carousel = this;

	// Create tag/path input field
	this.$tag = $('<input>', {class: 'carousel-tag'}).appendTo($carousel);
	this.$tag.bindEnter(function(ev){
		carousel.onTag(this.value);
	});

	// Focus management: clicking carousel gives it focus
	$carousel.click(ev => {
		$carousel.addClass('focus').siblings().removeClass('focus');
	});

	// Store DOM element and bidirectional reference
	this.t = this.$t[0];
	this.t.carousel = this;

	// Initialize drag-drop and scroll handlers
	this.allowUpload();
	this.supportOnEmpty();

	console.log(this.cfg);
	this.onScroll();
};

Carousel.prototype = {
	/**
	 * Handle tag input - loads view based on tag/path and optional owner
	 * Tag format: "path@owner" where owner is optional
	 * @param {string} tag - Tag or path to load
	 */
	onTag: function(tag){
		/*
		if(filter.path.indexOf(':/')+1){
			carousel.$tag.val(document.title);
			carousel.$tag.attr('disabled', true);
		}
		else{
			carousel.$tag.attr('disabled', false);
			carousel.$tag.val(filter.path);
		}
		*/

		// Get tag from previous carousel if exists
		var $up = this.$t.prevAll('.carousel');
		if($up.length){
			var upCarousel = $up[0].carousel,
					upTag = upCarousel.getPath();
		}

		// Use current location if no tag provided
		if(!tag){
			tag = this.getPath(document.location.href);
			console.log(tag);
			this.$tag.val(tag);
		}

		var tg = tag.split('@');

		// Prepend parent tag if current tag starts with @
		this.$tag.val(!tg[0]?(upTag+tag):tag);
		tg = tag.split('@');

		// Extract owner from URL if present
		var u = document.location.href.split('@')[1];

		console.log('U: ', u);

		// Route to appropriate load method based on owner
		if(typeof u == 'string'){
			var tgName = tg[0];

			this.owner = u;
			if(!u.length)
				this.loadPublic(tgName);  // No owner = public view
			else
				this.loadView(tgName);     // Has owner = private view
		}
		else{
			this.owner = null;
			this.loadView(tag);
		}
	},

	/**
	 * Create a thumbnail element and add to carousel
	 * Legacy method - creates simple image thumbnail
	 * @param {string} url - Image URL
	 * @param {jQuery} $before - Element to insert before (optional)
	 * @returns {jQuery} Created thumbnail element
	 */
	add: function(url, $before){
		if(!url) return;
		// Remove any clone elements from drag operations
		$(this.$t).children('.clone').remove();

		// Extract actual image URL from query string if needed
		var qs = parseQS(decodeURIComponent(url));

		if(qs && qs.imgurl)
			url = qs.imgurl;

		var $thumb = this.createThumb(url);
		$thumb[$before?'insertBefore':'appendTo']($before || this.$t).data({src: url});

		this.supportEvents($thumb);
		return $thumb;
	},

	/**
	 * Include URL in carousel - validates, saves to database, and creates thumbnail
	 * Handles image loading, dimension detection, and fallback to website scraping
	 * @param {string} url - URL to include (auto-prepends http:// if missing)
	 * @param {jQuery} $thumbOn - Element to insert before (optional)
	 */
	include: function(url, $thumbOn){
		if(!url) return;

		var carousel = this;

		// Ensure URL has protocol
		if(url.indexOf('http://')<0 && url.indexOf('https://')<0 && url.indexOf('ipfs://')<0)
			url = 'http://'+url;

		// Remove duplicate if already exists
		var $dub = this.find(url);
		if($dub) $dub.remove();

		// Create item object for database
		var item = {
			src: url,
			path: carousel.getPath(),
			//tag: carousel.$tag.val(),
			href: document.location.href,
			gid: User.id,
			type: 'image'
		};
		add = true;

		// Save item to database and build thumbnail
		var save = function(){
			Pix.send({
				cmd: 'save',
				item: item,
				collection: Cfg.collection
			}, function(r){
				if(!r || !r.item) return;

				//pix.defaultView.carousels[carousel.$t.index()].items.push(r.item.id);
				Pix.items[r.item.id] = r.item;

				var $thumb = pix.build(r.item);

				if($thumbOn && $thumbOn.length)
					$thumb.insertBefore($thumbOn);
				else
					carousel.$t.append($thumb);

				carousel.resize($thumb);
				carousel.supportEvents($thumb);

				carousel.updateView();
			});
		};

		// Services that don't need dimension validation
		var skipCheck = [
			'ggif.co',      // GIF creation service
			'th.ai',        // AI service
			'youtu.be',     // YouTube short URL
			'youtube.com'   // YouTube
		];

		// Skip dimension check for known services
		if(skipCheck.some(function(service){
			return url.indexOf(service)+1;
		}))
			save()
		else{
			// Validate image by loading and checking dimensions
			/*
			var $preloader = carousel.preloader();
			if($thumbOn && $thumbOn.length)
				$preloader.insertBefore($thumbOn);
			else
				carousel.$t.append($preloader);
			*/

			// Preload image to get dimensions
			var img = new Image();
			var intr = setInterval(function(){
				console.log(img.width+'x'+img.height);
				if(!img.width || !img.height) return;
				clearInterval(intr);

				item.width = img.width;
				item.height = img.height;

				console.log(item);

				save();
			}, 500);

			// Fallback: if image fails, try scraping website
			img.onerror = function(){
				if(item.type == 'link'){
					clearInterval(intr);
					console.error('Unable to load image: '+img.src);
					return;
				}

				item.type = 'link';
				item.link = url;

				Pix.send({
					cmd: 'website',
					url: url
				}, function(r){
					if(!r.src){
						clearInterval(intr);
						console.error('Unable to find image in site: '+url);
						return;
					}

					item.title = r.title;
					img.src = item.src = r.src;

					console.log(item);
				});

				console.log(item);
				//alert('Unable to load image');
				//console.error('Unable to load image: '+url);
			};

			img.onload = function(){
				item.width = img.width;
				item.height = img.height;
				console.log('loaded');
			};
			img.src = carousel.formatUrl(url);
		}
			//db.post(item);
	},

	/**
	 * Format URL for display - converts IPFS URLs to gateway format
	 * @param {string} url - URL to format
	 * @returns {string} Formatted URL
	 */
	formatUrl: function(url){
		if(url.indexOf('ipfs://') === 0){
			var hash = url.replace('ipfs://', '');

			return "http://127.0.1:8080/ipfs/"+hash;
		}

		return url;
	},

	/**
	 * Find thumbnails with given URL (including duplicates)
	 * @param {string} url - URL to search for
	 * @returns {jQuery|false} Found thumbnail parent or false
	 */
	find: function(url){
		var $found = this.$t.find('img[src="'+url+'"]');
		return ($found.length)?$found.parent():false;
	},

	/**
	 * Remove thumbnails with given URL from carousel
	 * @param {string} url - URL to remove
	 * @returns {jQuery} Removed elements
	 */
	remove: function(url){
		var t = this,
			$els = this.$t.children('.thumb[src="'+url+'"]'),
			targets = $.event.special.drop.targets;

		var l = $els.length;
		$els.hide('fast', function(){
			var index = targets.indexOf(this);
			targets.splice(index, 1);

			if(!--l){
				$els.remove();
				t.updateView();
				t.expand();
			}
		});

		return $els;
	},

	/**
	 * Load items into carousel
	 * @param {Array} items - Array of item URLs
	 */
	load: function(items){
		var t = this;
		if(items) items.forEach(function(item){
			t.add(item);
		});
		this.expand();
	},

	parseUrl: function(url){
		url = url.split('/').slice(0,4).join('/');
		if(url.indexOf('#')+1)
			url = url.substr(0, url.indexOf('#'));


		if(url.indexOf('index.')+1)
			url = url.substr(0, url.indexOf('index'));

		url = url.replace(/\/$/, "");

		return url;
	},

	createThumb: function(url){
		var wh = this.$t.height(),
			name = url.split('/').pop();

		var name = url.split(/(\\|\/)/g).pop();


		var img = new Image;
		var $thumb = $(img).attr({
			name: name,
			src: src || url,
			href: url
		}).addClass('thumb');
		img.onerror = function(){
			$thumb.remove();
		};


		//carousel.$thumbs = carousel.$thumbs.add($thumb);

		return $thumb;
	},

	/**
	 * Add drag-drop, click, and interaction events to a thumbnail
	 * Handles complex drag behavior including:
	 * - Horizontal scrolling
	 * - Vertical drag to reorder (up/down)
	 * - Drag between carousels
	 * - Momentum scrolling
	 * @param {jQuery} $thumb - Thumbnail element to enhance
	 */
	supportEvents: function($thumb){
		if(!$thumb || !$thumb.length) return;

		var name = $thumb.attr('name'),
			t = this,
			tw = $thumb.width()+1,
			th = $thumb.height();

		// remove previously associeted data by drag&drop lib.
		$thumb.off().removeData(['dragdata', 'dropdata']).click(function(){
			var o = $(this).offset();

			var item = $thumb.data();

			$thumb.addClass('focus').siblings().removeClass('focus');
			$('*:focus').blur();

			if(pix.move) delete pix.move;
			else
			if(item.type == 'view'){
				if(item.path && item.owner)
					t.onTag(item.path+'@'+item.owner);
			}
			else
			if(item.type == 'link'){
				window.open(item.link, "_blank");
			}
			else{
				//alert($thumb.children('img').attr('src'));
				$(this).children('.iframe-cover').hide();
				var item = $(this).data();
				if(item.timings && item.yid){
					var link = '/'+item.yid;
					if(item.startTime || item.duration) link += '&t=' + (item.startTime || 0);
					if(item.duration) link += ';' + item.duration;

					history.pushState({}, this.yid,  link);
					Tx.checkHash();
				}
				//var win = window.open(url, '_blank');
				//win.focus();
				//pix.show(this);
			}

			$(this).removeData('_pos');
		})

		var okDrag = (
			!$thumb.hasClass('item-user') &&
			this.getOwner() == User.name
		);

		console.log(okDrag);

		$thumb.drag("init", function(ev, dd){
			console.log(dd);
			$thumb.toggleClass('toggle');
		}, {click:true}).drag("start", function(ev, dd){
			var o = $(this).offset();
			$(this).data('_pos', o.left+'x'+o.top);
			dd.startParent = this.parentNode;

			Pix.drag2carousel = t;

			t.resize($thumb);

			tw = $(this).width()+1;
			th = $(this).height();

			//dd.limit = $space.children().length * $space.children().outerWidth(true) - w - m;
			dd.start = this.parentNode.scrollLeft;
			dd.lengthC = $('.carousel').length;

			dd.mv = 0;
			dd.m = 0;

			dd.index = $(this).index();

			var timestamp = Date.now(),
   				frame = dd.offsetX;
			var now, elapsed, delta, v;
			dd.pulse = 0;

			intr = setInterval(function(){
				now = Date.now();
				elapsed = now - timestamp;
				timestamp = now;
				delta = dd.offsetX - frame;
				frame = dd.offsetX;

				v = 30 * -delta / (1 + elapsed);
				dd.pulse = 0.8*v + 0.2 * dd.pulse;
			}, 50);
			t.stop = 1;

			var $thumb = $(this).clone().appendTo(t.$t.parent()).hide();
			return $thumb;
		}).drag(function(ev, dd){
			var $proxy = $(dd.proxy);

			var dy = Math.abs(dd.deltaY),
				dx = Math.abs(dd.deltaX);

			if(dy > Cfg.drag.dy && (/*dd.lengthC > 1 || */dx > Cfg.drag.dx) && !pix.slide){
				$proxy.addClass('drag').show();
				if(Pix && Pix.$trash)
					Pix.$trash.fadeIn('slow');
			}

			if(dd.deltaX || dd.deltaY)
				pix.move = this;

			if($proxy.hasClass('drag') && !pix.slide){
				pix.drag = true;
				$proxy.css({
					top: dd.offsetY - document.body.scrollTop,
					left: dd.offsetX
				});
				$(this).addClass('draggable');
			}
			else
			if(t.cfg.down2remove && dy > Cfg.drag.takeOffLimit && !pix.slide && okDrag){
				dd.down = Math.abs(dd.deltaY);

				if(dd.down/th > t.cfg.down2remove){
					var index = $thumb.index() + 1;
					//t.remove(url);

					var newIndex = Math.round(dd.deltaY>0?(index*2):(index/2)),
						$thumbs = $thumb.parent().children();

					var $newGap = $thumbs.eq(newIndex + (dd.deltaY>0?1:(-1)));



					$(dd.proxy).remove();
					$thumb.hide('fast', function(){
						if($newGap.length)
							$newGap.before($thumb);
						else{
							$thumb.parent().append($thumb);

							if(index == $thumb.index()+1){
								$thumb.remove();
								t.updateView();
							}
						}

						$thumb.mouseup();
						$thumb.show('fast', function(){
							$thumb.css('margin-top', 0);
						});
					});
				}

				$thumb.css({
					'margin-top': dd.deltaY,
					//'opacity': 1.1-dd.down/th/t.cfg.down2remove
				});
			}
			else{
				var x = dd.start - dd.deltaX;
				if(Math.abs(dd.deltaX) > t.cfg.slideLimit && dd.deltaX != 0)
					pix.slide = dd.deltaX;
				//if(x > dd.limit) x = dd.limit;



				if(t.cfg.allowPatterns){
					if(x > tw)
						t.$t.children('.thumb:first-child').appendTo(t.$t);
					else
					if(x < 0)
						t.$t.children('.thumb:last-child').prependTo(t.$t);
				}

				if(x > tw && t.cfg.allowPatterns){
					dd.start -= tw+1;
					this.parentNode.scrollLeft = 1;
				}
				else
				if(x < 0 && t.cfg.allowPatterns){
					dd.start += tw+1;
					this.parentNode.scrollLeft = tw;
				}
				else;
					this.parentNode.scrollLeft = Math.max(x, 0);
			}

        	dd.update();
		},{ click: true}).drag("end", function(ev, dd){
			$(dd.proxy).remove();

			if(!pix.move) return;

			if(dd.pulse)
				t.motion(dd.pulse);


			if(dd.down){
				delete dd.down;
				$(this).css({
					'margin-top': 0,
					opacity: 1
				});
			}

			setTimeout(function(){
				delete pix.move;
				delete pix.slide;


				if(Pix && Pix.$trash)
					Pix.$trash.fadeOut();
			},100);

			pix.drag = false;


			var $thumb = $(this).removeClass('drop');
			$('.draggable').removeClass('draggable');

			var carousel = $thumb.parent()[0].carousel;
			if(t.$t[0] != carousel.$t[0]){
				var thumb = $thumb.data();
				var $newThumb = $thumb.clone(true);
				$thumb.replaceWith($newThumb);
				$thumb.data(thumb);

				var $before = t.$t.children('.thumb').eq(dd.index-1);
				if($before.length)
					$thumb.insertBefore($before);
				else
					t.$t.append($thumb);

				t.supportEvents($thumb);


				carousel.resize($newThumb);
				carousel.supportEvents($newThumb);
				carousel.updateView();
			}

			if(!pix.slide)
				t.updateView();


			var parent = $thumb.removeClass('drop').parent()[0];
			if(parent)
				parent.slideX = parseInt($thumb.parent().css('margin-left'));

		}).drop("init",function(ev, dd){
			//console.log(dd);
			//console.log(this);
			var $thumb = $(this);
			//$('.drag').insertBefore();
			return !( this == dd.drag );
		}).drop("start", function(ev, dd){
			//console.log(this);
			var $thumb = $(this);
			//$('.drag').insertBefore();
			var ok = !( this == dd.drag || !pix.drag);
			if(ok && okDrag){
				var $drag = $(dd.drag);

				var bfr = $(this).index() <= $(dd.drag).index();

				console.log($(this).index()+' <= '+$(dd.drag).index());
				$(dd.drag)['insert'+((bfr)?'Before':'After')](this);

				dd.update();
			}
			return ok;
		}).drop(function(ev, dd){
			console.log(this);
		}).drop("end",function(ev, dd){
			console.log('dropEnd');
		});
	},

	/**
	 * Enable drag-drop functionality on empty carousels
	 * Allows dropping items into carousels with no content
	 */
	supportOnEmpty: function(){
		var carousel = this;
		var childs;
		this.$t.drop("init",function(ev, dd){
			//console.log(this);
			var $thumb = $(this);
			//$('.drag').insertBefore();
			childs = carousel.$t.children('.thumb').length
			return dd.childs;
		}).drop("start",function(ev, dd){
			if(childs > 0) return false;

			var $thumb = $(dd.drag);
			var ok = !( this == dd.drag || !pix.drag) && this.parentNode !== dd.drag.parentNode;
			//return false;
			if(ok){
				$thumb.appendTo(this);

				carousel.resize($thumb);
				carousel.supportEvents($thumb);

				dd.update();
			}
			return ok;
		}).drop('end', function(ev, dd){
			console.log('End drop');
		});
	},

	/**
	 * Resize thumbnail(s) to fit carousel height
	 * Maintains aspect ratio and handles images, iframes, and canvases
	 * @param {jQuery} $thumb - Specific thumbnail to resize, or resizes all if omitted
	 */
	resize: function($thumb){
		var carousel = this;
		if(!$thumb)
			return carousel.$t.children('span:not(.clone)').each(function(){
				carousel.resize($(this));
			});


		var h = this.$t.height();
		var d = $thumb.data();

		if($thumb.hasClass('item-user')){
			console.log(h);
			$thumb.css({
				width: h,
				height: h
			});
			return;
		}

		var iframe = $thumb.children('iframe')[0];
		if(iframe){
			var h = this.$t.height();

			var image = new Image;
			image.onload = function(){
				var w = h*image.width/image.height;

				$thumb.css({
					width: w,
					height: h
				}).data({
					width: image.width,
					height: image.height
				});
			}

			var url = iframe.src;
			if(url.indexOf('ggif.co')+1){
				var p = url.replace('http://', '').replace('https://', '').split(/[\/]+/);
				var thumb = 'http://'+p[0]+'/'+p[1]+'/'+p[1]+'.gif';

				image.src = thumb || url;
			}
			else{
				var video = pix.parseVideoURL(url),
					vid = video.provider;

				if(video.provider == 'youtube')
					image.src = 'http://img.youtube.com/vi/'+video.id+'/sddefault.jpg';
			}

			return;
		}


		var canvas = $thumb.children('canvas')[0];
		if(canvas){
			$thumb.children('canvas').css({
				height: h
			});
		};

		var set = function(){
			var w;
			if(image)
				w = h*image.width/image.height;

			if(!image || !image.width || !image.height)
				w = h*d.width/d.height;

			$thumb.css({
				width: w,
				height: h
			}).children('img').css({
				width: w,
				height: h
			});
		};

		var image = $thumb.children('img')[0];
		if(!image) return set();

		set();
		image.onload = set;
	},

	// drag thumbs down to remove them and all their clones
	drag: function(name, dy){
		var $els = this.$t.children('.thumb[name="'+name+'"]');

		if(Math.abs(dy) < 8) dy = 0;

		$els.css('margin-top', dy);
		if(dy > $els.height()/2){
			var l = $els.length;
			$els.hide('fast', function(){
				var d = $(this).data();
				$(this).remove();
				if(!--l){

				}
			});
		}
	},

	/**
	 * Get array of all unique image URLs in carousel
	 * @returns {Array<string>} Array of href attributes from thumbnails
	 */
	list: function(){
		var images = [];
		this.$t.children('.thumb:not(.clone,.drag)').each(function(){
			images.push($(this).attr('href'));
		});

		return images;
	},

	/**
	 * Get array of item IDs from all thumbnails in carousel
	 * @returns {Array<number>} Array of item IDs
	 */
	getIds: function(){
		var ids = [];
		this.$t.children('.thumb:not(.clone,.drag)').each(function(){
			var id = $(this).data('id');
			if(id) ids.push(id);
		});
		return ids;
	},

	saveList: function(){
		console.log(this.list());
		//chrome.storage.local.set({pic: this.list()});
	},


	/**
	 * Get page title
	 * @returns {string} Document title
	 */
	getTitle: function(path){
		return $('title').text();
	},

	/**
	 * Get carousel path - extracts meaningful path from URL or tag input
	 * Handles special domains (pix8.co, th.ai, wiki, etc.) to extract topic/identifier
	 * @param {string} path - Path to process (optional, uses tag or location.href)
	 * @returns {string} Normalized path identifier
	 */
	getPath: function(path){
		path = (
			path ||
			((this.$tag && !this.$tag.attr('disabled'))?this.$tag.val():'') ||
			document.location.href
		);

		var search = 'images.lh';
		if(path.indexOf(search)+1)
			path = path.substr(path.indexOf(search)+search.length+1).split('/')[0];

		var search = 'pix8.co';
		if(path.indexOf(search)+1)
			path = path.substr(path.indexOf(search)+search.length+1).split('/')[0];

		var search = 'th.ai';
		if(path.indexOf(search)+1)
			path = path.substr(path.indexOf(search)+search.length+1).split('/')[0];

		var search = 'preload.lh';
		if(path.indexOf(search)+1)
			path = path.substr(path.indexOf(search)+search.length+1).split('/')[0];

		var search = '/wiki';
		if(path.indexOf(search)+1)
			path = path.substr(path.indexOf(search)+search.length+1).split('/')[0];

		if(document.location.host == "8.io.cx")
			path = path.split('/').pop();

		if(path.indexOf('http') !== 0){
			path = path.toLowerCase();
			path = path.split('@')[0];
		}

		return path;
	},

	/**
	 * Get owner from tag (part after @ symbol)
	 * @returns {string} Owner username or User.name
	 */
	getOwner: function(){
		if(this.owner) return this.owner;

		var path = (
			((this.$tag && !this.$tag.attr('disabled'))?this.$tag.val():'') ||
			document.location.href
		);

		if(path.indexOf('http') == 0)
			return User.name;

		console.log(path);
		var owner = path.split('@')[1] || User.name;

		console.log(owner);

		return owner;
	},

	/**
	 * Save view (collection of item IDs) to database
	 * @param {Object} view - View object (optional, creates new if omitted)
	 * @returns {Object} Saved view object
	 */
	saveView: function(view){
		var carousel = this;
		if(!view) view = {
			items: this.getIds(),
			type: 'view'
		};

		view.path = carousel.getPath();

		if(view.path.indexOf('http') == 0)
			view.title = carousel.getTitle();

		view.gid = User.id;
		view.owner = this.getOwner();

		if(!view.items || !view.items.length) return;

		Pix.send({
			cmd: 'save',
			item: view,
			collection: Cfg.collection
		}, function(r){
			console.log(r);
			if(r.item){
				carousel.view = r.item;

				carousel.updatePublic();
			}
		});

		return view;
	},

	/**
	 * Update existing view with current item sequence
	 * Saves if no view exists yet
	 */
	updateView: function(){
		var carousel = this;

		console.log(this.view);

		if(this.view === false) return;

		if(!this.view) return carousel.saveView();

		var set = {
			items: carousel.getIds()
		};

		Pix.send({
			cmd: 'update',
			id: this.view.id,
			set: set,
			collection: Cfg.collection
		}, function(r){
			if(r.item){
				carousel.view.items = set.items;
				carousel.updatePublic();
				/*
				chrome.runtime.sendMessage({
					cmd: 'carousel.updated',
					path: carousel.getPath()
				});
				*/
			}
		});
	},

	updatePublic: function(){
		Pix.send({
			cmd: 'updateView',
			path: this.getPath(),
		}, function(r){

		});
	},

	/**
	 * Load multiple views matching filter (legacy/unused)
	 * @param {Object} filter - Query filter
	 */
	loadViews: function(filter){
		filter = {
			path: this.getPath(),
			type: 'view'
		}

		var carousel = this;
		delete carousel.view;

		carousel.$t.children('.thumb').remove();
		Pix.send({
			cmd: 'load',
			filter: filter,
			collection: Cfg.collection
		},
		function(r){
			var ids = [];
			(r.items || []).forEach(function(item){
				Pix.items[item.id] = item;
				ids.push(item.id);
			});

			carousel.spread(ids);
		});
	},

	/**
	 * Load user's private view for current path
	 * Falls back to public view if no private view exists
	 * @param {Object} filter - Query filter (auto-generated if omitted)
	 * @param {Function} cb - Callback with loaded view
	 */
	loadView: function(filter, cb){
		filter = {
			path: this.getPath(),
			owner: this.getOwner(),
			type: 'view'
		}

		var carousel = this;
		delete carousel.view;

		carousel.$t.children('.thumb').remove();
		Pix.send({
			cmd: 'get',
			filter: filter,
			collection: Cfg.collection
		},
		function(r){
			if(r.item)
				carousel.setView(r.item);
			else
				carousel.loadPublic();

			if(cb) cb(r.item);
		});
	},

	/**
	 * Load public/community view for current path
	 * Falls back to fill() if no public view exists
	 * @param {string} tag - Tag/path to load (optional)
	 */
	loadPublic: function(tag){
		var filter = {
			type: 'public',
			path: this.getPath()
		};

		var carousel = this;
		Pix.send({
			cmd: 'get',
			filter: filter,
			collection: Cfg.collection
		},
		function(r){
			if(r.item)
				carousel.setView(r.item);
			else
			if(	true ||
				!carousel.$t.children().length ||
				carousel.fillPath != filter.path
				//(carousel.view && carousel.view.path != filter.path
			)
				carousel.fill(carousel.getPath());

			delete carousel.view;
		});
	},

	/**
	 * Fetch view by path (tries private first, then public)
	 * @param {string} path - Path to fetch
	 * @returns {Promise<Object>} Promise resolving to view object
	 */
	fetchView: function(path){
		var filter = {
			path: path,
			owner: this.getOwner(),
			type: 'view'
		}

		var carousel = this;

		return new Promise(function(resolve, reject){
			Pix.send({
				cmd: 'get',
				filter: filter,
				collection: Cfg.collection
			},
			function(r){
				if(r.item)
					resolve(r.item);
				else{
					filter.type = 'public';
					delete filter.owner;

					Pix.send({
						cmd: 'get',
						filter: filter,
						collection: Cfg.collection
					},
					function(r){
						if(r.item)
							resolve(r.item);
						else
							reject();
					});
				}
			});
		});
	},

	/**
	 * Prepend items from another view to beginning of carousel
	 * @param {string} path - Path of view to prepend
	 */
	prependView: function(path){
		var carousel = this;
		this.fetchView(path).then(view => {
			if(!view || !view.items || !view.items.length) return;

			Pix.preload(view.items).then(function(){
				view.items.slice(0, carousel.cfg.fetchLimit).forEach(function(id){
					var item = Pix.items[id],
							$item = Pix.build(item);

					carousel.$t.prepend($item);
					carousel.supportEvents($item);
				});
				carousel.resize();

				carousel.updateView();
			});
		})
	},

	/**
	 * Set view and load associated items from database
	 * Fetches any items not already in cache
	 * @param {Object} view - View object with items array
	 */
	setView: function(view){
		//this.viewId = view.id;
		this.view = view;

		var carousel = this;

		if(view.owner)
			carousel.owner = view.owner

		//Pix.checkJquery();

		carousel.$t.children('.thumb').remove();
		if(view && view.items && view.items.length){
			//this.toIds(view.items);

			var newIds = [];
			view.items.forEach(function(id){
				if(!Pix.items[id])
					newIds.push(id);
			});

			if(newIds.length)
				Pix.send({
					cmd: 'load',
					filter: {
						id: {$in: newIds},
						//path: "console",
						//type: "public"
					},
					collection: Cfg.collection
				}, function(r){
					console.log(r);
					(r.items || []).forEach(function(item){
						Pix.items[item.id] = item;
					});

					carousel.spread(view.items);
				});

			else
				carousel.spread(view.items);
		}

		//Pix.cleanTargets();
	},


	loadRecent: function(filter){
		if(!filter) filter = {
			gid: User.id
		};

		var carousel = this;
		Pix.send({
			cmd: 'load',
			filter: filter,
			sort: {
				time: -1
			},
			limit: 32,
			collection: Cfg.collection
		}, function(r){
			var ids = [];
			carousel.view = false;
			carousel.$t.children('.thumb').remove();
			(r.items || []).forEach(function(item){
				Pix.items[item.id] = item;
				ids.push(item.id);
			});

			carousel.spread(ids);
		})
	},

	/**
	 * Loading state counter for fill operation
	 */
	loading: 0,

	/**
	 * Fill empty carousel with images from page or Google Images
	 * Validates image dimensions and saves to database
	 * @param {string} path - Path/search term to fill with
	 */
	fill: function(path){
		var carousel = this;

		if(carousel.loading) return;

		carousel.fillPath = path;
		carousel.getImages(path, function(images){
			carousel.$t.children('.thumb').remove();

			var images = images.slice(0, Cfg.collector.limit);
			carousel.loading = images.length;

			images.forEach(function(url){
				if(url.indexOf('http://')<0 && url.indexOf('https://')<0)
					url = 'http://'+url;

				var finish = function(){
					carousel.updateView();
					carousel.loading = false;
				};

				var img = new Image();
				img.onload = function(){

					if(
						Cfg.collector.minWidth > img.width ||
						Cfg.collector.minHeight > img.height
					) return carousel.loading--;

					var item = {
						path: path,
						type: 'image',
						src: url,
						gid: User.id,
						width: img.width,
						height: img.height
					};

					Pix.send({
						cmd: 'save',
						item: item,
						collection: Cfg.collection
					}, function(r){
						carousel.loading--;

						if(r.item){
							Pix.items[r.item.id] = r.item;
							var $thumb = carousel.push(r.item.id);
						}

						if(carousel.loading === 0)
							finish();
					});
					//db.post(item);
				}
				img.onerror = function(){
					carousel.loading--;

					if(carousel.loading === 0)
						finish();
				};

				img.src = url;
			});
		});
	},

	/**
	 * Convert thumbnail/page URLs to full-resolution image URLs
	 * Supports imgur and wikimedia
	 * @param {string} url - URL to convert
	 * @returns {string} Full resolution image URL
	 */
	getImgUrl: function(url){
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
	 * Get images from page or Google Images search
	 * @param {string} path - URL or search term
	 * @param {Function} cb - Callback receiving array of image URLs
	 */
	getImages: function(path, cb){
		var carousel = this;
		if(this.cfg.preloadLocal && (path.indexOf('http://')+1 || path.indexOf('https://')+1)){
			var images = [];

			$(document).find('a,img').each(function(){
				if(this.tagName == 'A' && this.href){
					var url = carousel.getImgUrl(this.href),
						ext = ''+url.split('.').pop();

					if(['jpg', 'jpeg', 'gif', 'png'].indexOf(ext)+1)
						images.push(url);
				}
				else
				if(this.tagName == 'IMG'){
					images.push(carousel.getImgUrl(this.src));
				}
			});

			cb(images.getUnique());
		}
		else
		if(this.cfg.preloadGoogle)
			pix.searchGoogle(path, function(images){
				cb(images.getUnique());
			});
	},

	/**
	 * Spread items across carousel (add all items)
	 * @param {Array<number>} srcs - Array of item IDs to add
	 * @param {*} cf - Unused parameter
	 */
	spread: function(srcs, cf){
		var carousel = this;
		srcs.forEach(function(id, i){
			carousel.push(id);
		});

		//pix.cleanTargets();
	},

	/**
	 * Push item to carousel (build and append thumbnail)
	 * @param {number} id - Item ID from pix.items cache
	 * @returns {jQuery} Created thumbnail element
	 */
	push: function(id){
		var $item;

		var item = pix.items[id];
		if(!item) return;

		$item = pix.build(item);

		this.$t.append($item);

		this.resize($item);
		this.supportEvents($item);

		return $item;
	},

	toIds: function(srcs){
		if(!srcs || !srcs.length) return;

		for(i = 0; i<srcs.length; i++){
			if(!isNaN(srcs[i]))
				srcs[i] = parseInt(srcs[i]);
		};

		return srcs;
	},

	getList: function(){
		var ids = [];
		this.$t.children('.thumb:not(.clone)').each(function(){
			var d = $(this).data();
			ids.push(d.id);
		});

		return ids;
	},

	// try to find a  thumbnail that represents the content inside that item,
	getThumb: function(d){
		var frameSrc;
		if(video.provider == 'youtube')
			frameSrc = 'http://www.youtube.com/embed/'+video.id;
		else
		if(video.provider == 'vimeo')
			frameSrc = 'http://player.vimeo.com/video/'+video.id;

		if(!document.getElementById('pic_'+data._id))
		$('<iframe></iframe>')
			.attr({src: frameSrc, id: 'pic_'+data._id}).appendTo('#pictures').hide();

		if(video.provider == 'vimeo'){
			$thumb = carousel.createThumb(data._id, '').appendTo(cont).data('url', url).data(data);

			$.ajax({
				type:'GET',
				url: 'http://vimeo.com/api/v2/video/' + video.id + '.json',
				jsonp: 'callback',
				dataType: 'jsonp',
				success: function(data){
					$thumb.attr('href', data[0].thumbnail_large).css('background-image', "url("+data[0].thumbnail_large+")");
				}
			});
		}
		else
		if(video.provider == 'youtube')
		$thumb = carousel.createThumb(data._id,  'http://img.youtube.com/vi/'+video.id+'/default.jpg').appendTo(cont).data('url', url);
	},

	/**
	 * Enable drag-drop file upload and URL dropping
	 * Handles both local files and text/URL drops
	 */
	allowUpload: function(){
		var t = this;
		function cancel(e){
			if (e.preventDefault) e.preventDefault(); // required by FF + Safari
			e.dataTransfer.dropEffect = 'copy'; // tells the browser what drop effect is allowed here
			return false; // required by IE
		}

		this.$t[0].addEventListener('dragstart', function(ev){
			ev.dataTransfer.setData('text/plain', null);
			console.log('DragStart');
		});

		this.$t[0].addEventListener('dragend', function(ev){
			console.log('DragEnd');
		});

		this.$t[0].addEventListener('dragover', cancel);
		this.$t[0].addEventListener('dragenter', cancel);
		this.$t[0].addEventListener('drop', function(ev){
			/*
			console.log(ev);
			console.log(ev.dataTransfer.files);
			console.log(ev.dataTransfer.getData('Text'));
			console.log(ev.dataTransfer.getData('text/plain'));
			*/

			if(ev.dataTransfer.files.length)
				return t.upload(ev);

			var txt = ev.dataTransfer.getData('URL') || ev.dataTransfer.getData('Text');

			txt = t.getImgUrl(Pix.parseURL(txt));

			var $thumb = $(ev.target);
			if(!$thumb.data('id'))
				$thumb = $thumb.parents('span');

			var name = txt.split(/(\\|\/)/g).pop();
			if(Pix.files.indexOf(name)<0)
				Pix.send({cmd: 'download', url: txt});

			if(isURL(txt)){
				(t.cfg.onAdd || $.noop)(txt, $thumb);
			}
			else{
				(t.cfg.onText || $.noop)(txt, $thumb);
			}

			ev.preventDefault();
			return false
		}, false);
	},

	/**
	 * Upload dropped/pasted files to server
	 * Supports both drag-drop and paste events
	 * Reads file, uploads via WebSocket, saves to database
	 * @param {Event} ev - Drop or paste event
	 * @param {jQuery} $before - Element to insert before (optional)
	 * @returns {boolean} False to prevent default
	 */
	upload: function(ev, $before){
		var carousel = this;

		var files = ev.dataTransfer.files; // FileList object

	    // Loop through the FileList and render image files as thumbnails.
	    for (var i = 0, f; f = files[i]; i++){
			// Only process image files.
			if(!f.type.match('image.*'))
				continue;

			var reader = new FileReader();

			// Closure to capture the file information.
			reader.onload = function(ev){
				ipfs.add(Buffer.from(ev.target.result)).then(function(r){
					if(!r || !r.length) return;

					carousel.include('ipfs://'+r[0].path);
				});
			};
			reader.readAsArrayBuffer(f);
	    };

		ev.preventDefault();
		return false;
	},

	/*
	var items = (event.clipboardData || event.originalEvent.clipboardData).items;
  console.log(JSON.stringify(items)); // will give you the mime types
  for (index in items) {
    var item = items[index];
    if (item.kind === 'file') {
      var blob = item.getAsFile();
      var reader = new FileReader();
      reader.onload = function(event){
        console.log(event.target.result)}; // data url!
      reader.readAsDataURL(blob);
    }
  }
	*/

	/**
	 * Upload files from drop or paste event (second implementation)
	 * Handles both event types and creates upload preview
	 * @param {Event} ev - Drop or paste event
	 * @param {jQuery} $before - Element to insert before
	 * @returns {boolean} False to prevent default
	 */
	upload: function(ev, $before){
		console.log(ev);

		// Extract files from drop or paste event
		var files;
		if(ev.type == 'drop')
			files = ev.dataTransfer.files; // FileList object
		else
		if(ev.type == 'paste')
			files = (ev.clipboardData || ev.originalEvent.clipboardData).items;

		var carousel = this;
	  // Loop through the FileList and render image files as thumbnails.
		for (var i = 0, f; f = files[i]; i++){
			// Only process image files.
			console.log(f);


			if (f.kind === 'file'){
				f = f.getAsFile();
				console.log(f);
			}

			if(!f.type.match('image.*'))
				continue;

			var reader = new FileReader();

			var lf = f;
			// Closure to capture the file information.
			reader.onload = function(ev1){
				var item = {
					src: ev1.target.result,
					type: 'image'
				};

				var $item = Pix.build(item);
				$item.addClass('uploading');

				if($before)
					$item.insertBefore($before);
				else
				if(ev.target.src)
					$item.insertBefore(ev.target.parentNode);
				else
					carousel.$t.append($item);

				carousel.resize($item);

				var reader = new FileReader();
				reader.onload = function(ev2){
					ws.upload(ev2.target.result, function(file){
						if(!file) return $item.remove();

						var img = $item.children('img')[0];

						var item = {
							src: Cfg.files+file.id,
							file: file.id,
							width: img.naturalWidth,
							height: img.naturalHeight,
							path: carousel.getPath(),
							//tag: carousel.$tag.val(),
							href: document.location.href,
							gid: User.id,
							type: 'image'
						};

						ws.send({
							cmd: 'save',
							item: item,
							collection: Cfg.collection
						}, function(r){
							if(r.item){
								Pix.items[r.item.id] = r.item;
								$item.removeClass('uploading');
								$item.data(r.item);
								$item.attr({
									id: 'image-'+r.item.id
								});

								carousel.resize($item);
								carousel.supportEvents($item);
								carousel.updateView();
							}
						});
					});
				}
				reader.readAsArrayBuffer(lf);
			};
			reader.readAsDataURL(f);
		};

		ev.preventDefault();
		return false;
	},

	paste: function(dataURL, $before){
		var item = {
			src: dataURL,
			type: 'image'
		};

		var $item = Pix.build(item);
		$item.addClass('uploading');

		if($before)
			$item.insertBefore($before);
		else
			carousel.$t.append($item);

		carousel.resize($item);

		var reader = new FileReader();
		reader.onload = function(ev2){
			ws.upload(ev2.target.result, function(file){
				if(!file) return $item.remove();

				var img = $item.children('img')[0];

				var item = {
					src: Cfg.files+file.id,
					file: file.id,
					width: img.naturalWidth,
					height: img.naturalHeight,
					path: carousel.getPath(),
					//tag: carousel.$tag.val(),
					href: document.location.href,
					gid: User.id,
					type: 'image'
				};

				ws.send({
					cmd: 'save',
					item: item,
					collection: Cfg.collection
				}, function(r){
					if(r.item){
						Pix.items[r.item.id] = r.item;
						$item.removeClass('uploading');
						$item.data(r.item);
						$item.attr({
							id: 'image-'+r.item.id
						});

						carousel.resize($item);
						carousel.supportEvents($item);
						carousel.updateView();
					}
				});
			});
		}
	},

	/**
	 * Apply momentum scrolling animation after drag release
	 * Uses exponential decay for natural feel
	 * @param {number} amplitude - Initial velocity
	 */
	motion: function(amplitude){
		var carousel = this;

		carousel.stop = 0;

		var timeConstant = 325,
			timestamp = Date.now();

		var m = 0;
		function step(stamp){
			if(carousel.stop) return;// carousel.updateView();

			var elapsed = timestamp - Date.now();
			var delta = amplitude * Math.exp(elapsed / timeConstant);;
			carousel.scroll(delta);
			m+=delta;

			if(delta>0.7 || delta<-0.7)
				window.requestAnimationFrame(step);
			else{
				//carousel.updateView();
			}
		}

		window.requestAnimationFrame(step);
	},

	onScroll: function(){
		var carousel = this;
		this.$t.on("scroll", function(ev){
			ev.preventDefault();
			return false;
		});
		//this.t.scrollLeft = 2;
	},


	/**
	 * Scroll position tracking
	 */
	x: 0,
	left: 0,

	/**
	 * Scroll carousel by delta pixels
	 * Handles infinite scrolling if enabled
	 * @param {number} delta - Pixels to scroll (positive = right)
	 */
	scroll: function(delta){
		if(!delta) return;
		delta = Math.round(delta);

		var carousel = this;

		var x = this.t.scrollLeft;
		x += delta;

		this.t.scrollLeft = x;//Math.max(this.x, 0);
		if(this.infinite)
			return;

		return;

		var w;
		if(x < 0){
			w = carousel.$t.children('.thumb:last-child').prependTo(carousel.$t).width();
			carousel.t.scrollLeft = w;
		}
		else
		if(x > (carousel.$t[0].scrollWidth - carousel.$t.width())){
			w = carousel.$t.children('.thumb:first-child').appendTo(carousel.$t).width();
			carousel.t.scrollLeft -= w;
		}
	},

	/**
	 * Export carousel items as JSON array
	 * Removes internal properties (dragdata, dropdata, _id)
	 * @returns {string} JSON string of items array
	 */
	exportJSON: function(){
		var out = '[';
		var $items = this.$t.children('span:not(.clone)');
		$items.each(function(i){
			var item = $(this).data();
			delete item._id;
			delete item.dragdata;
			delete item.dropdata;
			out += JSON.stringify(item);
			if(i<($items.length-1)) out += ',\n';
		});
		return out+']';
	}
}

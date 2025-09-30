# CAROUSEL.md - Function Documentation

This document provides a comprehensive overview of the Carousel module functions and their purposes.

## Module Overview

Carousel is a sophisticated horizontal scrolling image gallery component that provides drag-drop functionality, file uploads, view management, and complex interaction behaviors. It serves as the primary UI component for organizing and displaying image collections in the pix8 application, supporting multiple platforms (Chrome Extension, Electron, Web).

## Core Functionality

1. **Drag-Drop System** - Complex drag behavior with horizontal scrolling, vertical reordering, and cross-carousel movement
2. **View Management** - Save/load user-specific and public image collections
3. **File Upload** - Drag-drop and paste file uploads via WebSocket
4. **Auto-Population** - Fill empty carousels from page images or Google Image Search
5. **Momentum Scrolling** - Natural physics-based scrolling animation
6. **Dynamic Resizing** - Maintain aspect ratios across different carousel heights
7. **IPFS Integration** - Support for decentralized file storage
8. **Path Management** - Intelligent path extraction from URLs and tags

## Configuration Properties

```javascript
{
  allowPatterns: false,     // Enable infinite pattern scrolling
  down2remove: 0.5,          // Drag down threshold (0.5 = 50% of height)
  takeOffLimit: 5,           // Pixel threshold to start drag
  slideLimit: 10,            // Pixel threshold to register as slide
  infinite: true,            // Enable infinite scrolling
  preloadLocal: true,        // Auto-collect images from current page
  preloadGoogle: true,       // Use Google Image Search for filling
  fetchLimit: 8,             // Max items to fetch when prepending views
  name: 'carousel-name',     // Carousel identifier
  onAdd: function() {},      // Callback when item is added
  onText: function() {}      // Callback for text drops
}
```

## Data Structures

### Item Object
```javascript
{
  id: number,           // Unique database ID
  src: string,          // Image source URL
  path: string,         // Associated path/tag
  href: string,         // Link destination
  file: string,         // Local file identifier
  gid: number,          // User/group ID
  type: string,         // 'image', 'link', 'view', 'public'
  width: number,        // Image width in pixels
  height: number,       // Image height in pixels
  text: string,         // Optional text overlay
  title: string         // Item title
}
```

### View Object
```javascript
{
  id: number,              // View ID
  items: Array<number>,    // Array of item IDs
  path: string,            // Path/tag identifier
  owner: string,           // Username of owner
  type: 'view'|'public',  // View visibility type
  title: string,           // View title
  gid: number              // Group/user ID
}
```

### Thumbnail Element Structure
```html
<div class="carousel bar focus">
  <input class="carousel-tag" />  <!-- Path/tag input -->
  <span class="thumb [youtube|ggif|file] focus uploading"
        href="[url]"
        name="[filename]"
        id="image-[id]">
    <img|iframe|canvas>           <!-- Media element -->
    <article>text</article>       <!-- Optional text overlay -->
    <div class="iframe-cover"></div>  <!-- Drag helper -->
  </span>
  <!-- More thumbnails... -->
</div>
```

## Function Documentation

### Constructor

#### `Carousel(opt)`
**Purpose**: Create new carousel instance with drag-drop, upload, and view management
**Parameters**:
- `opt` (Object) - Configuration options to extend defaults

**Description**: Initializes carousel DOM structure, creates tag input field, sets up event handlers for focus management, drag-drop, and scrolling. Returns carousel instance with bidirectional DOM reference.

**Usage**:
```javascript
var carousel = new Carousel({
  name: 'my-carousel',
  preloadLocal: false,
  onAdd: function(url, $thumb) {
    carousel.include(url, $thumb);
  }
});
carousel.$t.appendTo('#container');
```

### Core Item Management

#### `add(url, $before)`
**Purpose**: Create a thumbnail element and add to carousel (legacy method)
**Parameters**:
- `url` (string) - Image URL
- `$before` (jQuery) - Element to insert before (optional)
**Returns**: jQuery element - Created thumbnail element
**Description**: Creates simple image thumbnail using `createThumb()`, extracts actual image URL from query strings, and adds event handlers via `supportEvents()`.

#### `include(url, $thumbOn)`
**Purpose**: Include URL in carousel - validates, saves to database, and creates thumbnail
**Parameters**:
- `url` (string) - URL to include (auto-prepends http:// if missing)
- `$thumbOn` (jQuery) - Element to insert before (optional)
**Description**:
- Comprehensive URL validation and image loading
- Auto-prepends protocol if missing (http://, https://, ipfs://)
- Removes duplicates before adding
- Validates image dimensions via preloading
- Falls back to website scraping if direct image fails
- Skips validation for known services (YouTube, ggif.co, th.ai)
- Saves to database via `Pix.send()` with item metadata
- Builds thumbnail and updates view

**Flow**:
1. Normalize URL and remove duplicates
2. Create item object with metadata
3. For known services → save immediately
4. For images → preload to get dimensions → save
5. On load error → try website scraping for og:image
6. Build thumbnail and insert into carousel
7. Update view in database

#### `find(url)`
**Purpose**: Find thumbnails with given URL (including duplicates)
**Parameters**:
- `url` (string) - URL to search for
**Returns**: jQuery|false - Found thumbnail parent or false
**Description**: Searches for `<img>` elements with matching src and returns parent span.

#### `remove(url)`
**Purpose**: Remove thumbnails with given URL from carousel
**Parameters**:
- `url` (string) - URL to remove
**Returns**: jQuery - Removed elements
**Description**: Hides with animation, cleans up drag-drop targets, updates view, and triggers expand.

#### `load(items)`
**Purpose**: Load items into carousel
**Parameters**:
- `items` (Array) - Array of item URLs
**Description**: Iterates through items calling `add()` for each, then expands carousel.

#### `createThumb(url)`
**Purpose**: Create simple image thumbnail element (legacy)
**Parameters**:
- `url` (string) - Image URL
**Returns**: jQuery - Image element with thumb class
**Description**: Creates basic `<img>` element with error handling that removes on failure.

### View Management Functions

#### `saveView(view)`
**Purpose**: Save view (collection of item IDs) to database
**Parameters**:
- `view` (Object) - View object (optional, creates new if omitted)
**Returns**: Object - Saved view object
**Description**:
- Creates view object with current item IDs
- Adds path, title, owner, and gid metadata
- Sends to database via Pix.send()
- Stores returned view as `carousel.view`
- Calls `updatePublic()` to update public view list

#### `updateView()`
**Purpose**: Update existing view with current item sequence
**Description**:
- Returns early if `view === false` (disabled)
- Calls `saveView()` if no view exists
- Otherwise sends update command with new item array
- Syncs public view list via `updatePublic()`

#### `updatePublic()`
**Purpose**: Update public view listing
**Description**: Sends `updateView` command to server to refresh public view cache.

#### `loadView(filter, cb)`
**Purpose**: Load user's private view for current path
**Parameters**:
- `filter` (Object) - Query filter (auto-generated if omitted)
- `cb` (Function) - Callback with loaded view
**Description**:
- Queries database for view matching path and owner
- Falls back to `loadPublic()` if no private view found
- Calls `setView()` to populate carousel with items

#### `loadViews(filter)`
**Purpose**: Load multiple views matching filter (legacy/unused)
**Parameters**:
- `filter` (Object) - Query filter
**Description**: Loads all matching views and spreads items into carousel.

#### `loadPublic(tag)`
**Purpose**: Load public/community view for current path
**Parameters**:
- `tag` (string) - Tag/path to load (optional)
**Description**:
- Queries for public view matching path
- Falls back to `fill()` to auto-populate if no public view exists
- Disables view saving by setting `carousel.view = null`

#### `fetchView(path)`
**Purpose**: Fetch view by path (tries private first, then public)
**Parameters**:
- `path` (string) - Path to fetch
**Returns**: Promise<Object> - Promise resolving to view object
**Description**: Two-stage query: private view with owner, then public view if private fails.

#### `prependView(path)`
**Purpose**: Prepend items from another view to beginning of carousel
**Parameters**:
- `path` (string) - Path of view to prepend
**Description**:
- Fetches view via `fetchView()`
- Preloads items via `Pix.preload()`
- Prepends limited number (cfg.fetchLimit) to carousel
- Updates current view in database

#### `setView(view)`
**Purpose**: Set view and load associated items from database
**Parameters**:
- `view` (Object) - View object with items array
**Description**:
- Stores view reference
- Clears existing thumbnails
- Identifies items not in cache
- Fetches missing items from database
- Calls `spread()` to populate carousel

#### `spread(srcs, cf)`
**Purpose**: Spread items across carousel (add all items)
**Parameters**:
- `srcs` (Array<number>) - Array of item IDs to add
- `cf` (*) - Unused parameter
**Description**: Iterates through IDs calling `push()` for each item.

#### `push(id)`
**Purpose**: Push item to carousel (build and append thumbnail)
**Parameters**:
- `id` (number) - Item ID from pix.items cache
**Returns**: jQuery - Created thumbnail element
**Description**:
- Gets item from `pix.items[id]`
- Builds thumbnail via `pix.build()`
- Appends to carousel
- Resizes and adds event handlers

#### `loadRecent(filter)`
**Purpose**: Load recent items sorted by time
**Parameters**:
- `filter` (Object) - Query filter (defaults to user's items)
**Description**:
- Queries database with time sort (newest first)
- Limits to 32 items
- Disables view saving
- Spreads items into carousel

### Auto-Population Functions

#### `fill(path)`
**Purpose**: Fill empty carousel with images from page or Google Images
**Parameters**:
- `path` (string) - Path/search term to fill with
**Description**:
- Guards against multiple concurrent fills via `loading` counter
- Gets images via `getImages()`
- Limits to `Cfg.collector.limit`
- Validates minimum dimensions (`Cfg.collector.minWidth/minHeight`)
- Preloads each image to get dimensions
- Saves validated images to database
- Creates thumbnails and updates view

**Flow**:
1. Check if already loading
2. Get images from page or Google
3. Preload each image
4. Validate dimensions
5. Create item object
6. Save to database
7. Build thumbnail
8. Update view when all complete

#### `getImages(path, cb)`
**Purpose**: Get images from page or Google Images search
**Parameters**:
- `path` (string) - URL or search term
- `cb` (Function) - Callback receiving array of image URLs
**Description**:
- If path is URL and `preloadLocal` enabled:
  - Scans current page for `<a>` and `<img>` tags
  - Extracts image URLs
  - Converts thumbnails to full resolution via `getImgUrl()`
- Otherwise if `preloadGoogle` enabled:
  - Searches Google Images via `pix.searchGoogle()`
- Returns unique image URLs

#### `getImgUrl(url)`
**Purpose**: Convert thumbnail/page URLs to full-resolution image URLs
**Parameters**:
- `url` (string) - URL to convert
**Returns**: string - Full resolution image URL
**Description**: Handles special cases:
- **imgur.com**: Converts page URL to direct image (adds .jpg extension)
- **wikimedia**: Removes `/thumb/` path segments to get full size
- Returns original URL for others

### Path & Owner Functions

#### `getPath(path)`
**Purpose**: Get carousel path - extracts meaningful path from URL or tag input
**Parameters**:
- `path` (string) - Path to process (optional, uses tag or location.href)
**Returns**: string - Normalized path identifier
**Description**: Extracts topic/identifier from URLs by handling special domains:
- **images.lh**: Extracts ID after domain
- **pix8.co**: Extracts path after domain
- **th.ai**: Extracts identifier
- **preload.lh**: Extracts path
- **/wiki**: Extracts Wikipedia topic
- **8.io.cx**: Uses last path segment
- Converts to lowercase for non-URLs
- Removes owner suffix (part after @)

#### `parseUrl(url)`
**Purpose**: Parse and normalize URL (legacy)
**Parameters**:
- `url` (string) - URL to parse
**Returns**: string - Normalized URL
**Description**: Truncates to first 4 path segments, removes hash and index files, strips trailing slash.

#### `getOwner()`
**Purpose**: Get owner from tag (part after @ symbol)
**Returns**: string - Owner username or User.name
**Description**:
- Returns `this.owner` if already set
- Extracts owner from tag input (part after @)
- Returns User.name for URLs (http-prefixed)
- Defaults to User.name if no @ present

#### `getTitle(path)`
**Purpose**: Get page title
**Returns**: string - Document title
**Description**: Returns current document title via `$('title').text()`.

#### `getIds()`
**Purpose**: Get array of item IDs from all thumbnails in carousel
**Returns**: Array<number> - Array of item IDs
**Description**: Iterates through thumbnails extracting `data('id')` from each.

#### `list()`
**Purpose**: Get array of all unique image URLs in carousel
**Returns**: Array<string> - Array of href attributes from thumbnails
**Description**: Iterates through thumbnails (excluding clones and drag proxies) collecting href attributes.

#### `getList()`
**Purpose**: Get array of item IDs (alias for getIds)
**Returns**: Array<number> - Array of item IDs
**Description**: Same as `getIds()` but different implementation.

### Drag-Drop & Interaction Functions

#### `supportEvents($thumb)`
**Purpose**: Add drag-drop, click, and interaction events to a thumbnail
**Parameters**:
- `$thumb` (jQuery) - Thumbnail element to enhance
**Description**: Complex event handling system providing:

**Click Behavior**:
- Focus management (adds/removes `.focus` class)
- Opens links for `type: 'link'` items
- Opens views for `type: 'view'` items
- Hides iframe covers for embedded content
- Handles YouTube timecode navigation

**Drag Initialization**:
- Creates drag proxy (clone)
- Stores drag state (start position, parent, index)
- Calculates velocity via pulse tracking (50ms intervals)
- Sets `Pix.drag2carousel` reference

**Drag Behavior** (3 modes):
1. **Horizontal Scroll** (default):
   - Updates scrollLeft based on deltaX
   - Applies slideLimit threshold
   - Supports infinite scrolling patterns if enabled

2. **Vertical Drag** (down2remove):
   - Detects vertical movement beyond threshold
   - Calculates new position (double/half index)
   - Moves item up/down in sequence
   - Shows margin animation

3. **Cross-Carousel Drag**:
   - Shows drag proxy when movement exceeds thresholds
   - Applies CSS transforms for visual feedback
   - Enables drops on other carousels

**Drop Behavior**:
- Reorders items within carousel
- Moves items between carousels
- Updates view in database
- Cleans up proxy elements

**Drag End**:
- Applies momentum scrolling if velocity detected
- Resets drag state
- Updates view in database
- Fades out trash indicator

#### `supportOnEmpty()`
**Purpose**: Enable drag-drop functionality on empty carousels
**Description**:
- Allows dropping items into carousels with no content
- Checks child count before accepting drop
- Appends item to empty carousel
- Resizes and adds event handlers
- Prevents drops if carousel has children

### Resizing Functions

#### `resize($thumb)`
**Purpose**: Resize thumbnail(s) to fit carousel height
**Parameters**:
- `$thumb` (jQuery) - Specific thumbnail to resize, or resizes all if omitted
**Description**: Maintains aspect ratio while fitting to carousel height:

**For all thumbnails** (no parameter):
- Recursively calls resize for each child thumbnail

**For user items**:
- Sets both width and height to carousel height (square)

**For iframes** (YouTube, ggif.co):
- Loads thumbnail image to get aspect ratio
- Calculates width from height × aspect ratio
- Applies dimensions to iframe container
- Stores original dimensions in data

**For canvas** (animated GIFs):
- Sets canvas height to carousel height
- Preserves aspect ratio

**For images**:
- Calculates width from height × aspect ratio
- Falls back to stored dimensions if image not loaded
- Sets both container and image dimensions
- Registers onload handler for late-loading images

### Upload Functions

#### `allowUpload()`
**Purpose**: Enable drag-drop file upload and URL dropping
**Description**: Sets up native drag-drop event handlers:
- `dragover` / `dragenter`: Prevents default and shows copy cursor
- `dragstart` / `dragend`: Logs drag state
- `drop`: Handles two types:
  1. **Files**: Calls `upload()` for local file processing
  2. **URLs/Text**:
     - Extracts URL from dataTransfer
     - Converts to full-resolution via `getImgUrl()`
     - Downloads via `Pix.send({cmd: 'download'})`
     - Calls `onAdd` or `onText` callback

#### `upload(ev, $before)` (First implementation)
**Purpose**: Upload dropped files to IPFS
**Parameters**:
- `ev` (Event) - Drop event
**Returns**: boolean - False to prevent default
**Description**:
- Extracts FileList from drop event
- Filters for image files only
- Reads as ArrayBuffer via FileReader
- Uploads to IPFS via `ipfs.add()`
- Includes resulting IPFS URL via `carousel.include()`

#### `upload(ev, $before)` (Second implementation)
**Purpose**: Upload files from drop or paste event to server
**Parameters**:
- `ev` (Event) - Drop or paste event
- `$before` (jQuery) - Element to insert before
**Returns**: boolean - False to prevent default
**Description**: More comprehensive upload handling:
- Supports both drop and paste events
- Extracts files from appropriate event property
- Handles clipboard items for paste
- Creates upload preview with data URL
- Reads file twice (data URL + ArrayBuffer)
- Uploads via `ws.upload()` WebSocket
- Saves to database with dimensions
- Updates view after upload complete
- Removes preview on failure

**Upload Flow**:
1. Create preview thumbnail with data URL
2. Add `.uploading` class
3. Insert before target or append
4. Read file as ArrayBuffer
5. Upload via WebSocket
6. Get file ID from response
7. Create item object with dimensions
8. Save to database
9. Remove `.uploading` class
10. Update view

#### `paste(dataURL, $before)`
**Purpose**: Upload image from paste data URL
**Parameters**:
- `dataURL` (string) - Base64 data URL
- `$before` (jQuery) - Element to insert before
**Description**: Similar to upload but starts with data URL instead of File object.

### Scrolling Functions

#### `onScroll()`
**Purpose**: Set up scroll event handler
**Description**: Binds scroll event that prevents default (scrolling controlled programmatically).

#### `scroll(delta)`
**Purpose**: Scroll carousel by delta pixels
**Parameters**:
- `delta` (number) - Pixels to scroll (positive = right)
**Description**:
- Rounds delta to integer
- Updates `scrollLeft` property
- Handles infinite scrolling if enabled:
  - When scrolled left of start: moves last item to beginning
  - When scrolled right of end: moves first item to end
  - Adjusts scrollLeft to maintain visual position

#### `motion(amplitude)`
**Purpose**: Apply momentum scrolling animation after drag release
**Parameters**:
- `amplitude` (number) - Initial velocity
**Description**:
- Uses exponential decay for natural feel
- Time constant of 325ms
- Calls `scroll()` in requestAnimationFrame loop
- Stops when delta drops below 0.7 pixels
- Can be interrupted by setting `carousel.stop = 1`

**Physics**:
```javascript
delta = amplitude * exp(elapsed / timeConstant)
```

### Utility Functions

#### `formatUrl(url)`
**Purpose**: Format URL for display - converts IPFS URLs to gateway format
**Parameters**:
- `url` (string) - URL to format
**Returns**: string - Formatted URL
**Description**: Converts `ipfs://HASH` to `http://127.0.1:8080/ipfs/HASH` for local gateway access.

#### `toIds(srcs)`
**Purpose**: Convert string IDs to integers
**Parameters**:
- `srcs` (Array) - Array of IDs (strings or numbers)
**Returns**: Array - Array of integer IDs
**Description**: Parses each element as integer if numeric.

#### `saveList()`
**Purpose**: Save list to storage (legacy/unused)
**Description**: Logs item list to console (Chrome storage code commented out).

#### `getThumb(d)`
**Purpose**: Get video thumbnail (legacy/incomplete)
**Parameters**:
- `d` (Object) - Data object
**Description**: Partial implementation for Vimeo/YouTube thumbnail extraction.

#### `exportJSON()`
**Purpose**: Export carousel items as JSON array
**Returns**: string - JSON string of items array
**Description**:
- Iterates through thumbnails
- Extracts data from each
- Removes internal properties (_id, dragdata, dropdata)
- Formats as JSON array string with newlines

### Drag Function (Legacy)

#### `drag(name, dy)`
**Purpose**: Drag thumbnails down to remove (legacy)
**Parameters**:
- `name` (string) - Thumbnail name attribute
- `dy` (number) - Vertical delta
**Description**:
- Applies margin-top transform
- Removes if dragged below 50% of height
- Thresholds movement < 8px to 0

## Drag-Drop States

### Drag State Flags
- `pix.drag` (boolean) - True when dragging (proxy visible)
- `pix.move` (boolean) - True when any movement detected
- `pix.slide` (number) - Non-zero when horizontal slide detected
- `Pix.drag2carousel` - Reference to source carousel

### Drag Data (dd object)
```javascript
{
  startParent: node,      // Original parent element
  start: number,          // Initial scrollLeft
  lengthC: number,        // Number of carousels
  mv: number,             // Movement accumulator
  m: number,              // Margin accumulator
  index: number,          // Original index in parent
  pulse: number,          // Current velocity
  down: number,           // Vertical drag amount
  deltaX: number,         // Horizontal movement
  deltaY: number,         // Vertical movement
  offsetX: number,        // Absolute X position
  offsetY: number         // Absolute Y position
}
```

### Thumbnail Classes
- `.thumb` - Base thumbnail class
- `.clone` - Drag proxy element
- `.drag` - Actively dragging element
- `.draggable` - Source element during drag
- `.focus` - Focused/selected element
- `.drop` - Drop target indicator
- `.uploading` - Upload in progress
- `.youtube` / `.ggif` / `.file` - Content type indicators
- `.item-user` - User profile thumbnails
- `.toggle` - Toggle state

## View Types

### Private View
- Owned by specific user
- Query: `{path: X, owner: Y, type: 'view'}`
- Saved automatically on changes
- User can reorder and customize

### Public View
- Community/shared view
- Query: `{path: X, type: 'public'}`
- Fallback when no private view exists
- Read-only for non-owners

### View Lifecycle
1. **Create**: `saveView()` creates new view with current items
2. **Load**: `loadView()` fetches and displays items
3. **Update**: `updateView()` saves item order changes
4. **Sync**: `updatePublic()` refreshes public view cache

## Path Extraction

### Special Domains

| Domain | Extraction Logic | Example |
|--------|-----------------|---------|
| images.lh | After domain | images.lh/abc → abc |
| pix8.co | After domain | pix8.co/topic → topic |
| th.ai | After domain | th.ai/xyz → xyz |
| preload.lh | After domain | preload.lh/test → test |
| /wiki | After /wiki/ | /wiki/Python → Python |
| 8.io.cx | Last segment | 8.io.cx/a/b/c → c |

### Tag Format
- `path` - Regular path (user's private view)
- `path@` - Public view (empty owner)
- `path@user` - Specific user's view
- URLs (http://) - Use User.name as owner

## Database Operations

### Commands Used

```javascript
// Save new item
{cmd: 'save', item: {}, collection: 'items'}

// Update existing item
{cmd: 'update', id: N, set: {}, collection: 'items'}

// Get single item
{cmd: 'get', filter: {}, collection: 'items'}

// Load multiple items
{cmd: 'load', filter: {}, collection: 'items', sort: {}, limit: N}

// Download file
{cmd: 'download', url: 'http://...'}

// Scrape website
{cmd: 'website', url: 'http://...'}

// Update public view
{cmd: 'updateView', path: 'topic'}
```

## Event Flow

### Adding URL to Carousel
```
User drops/pastes URL
  ↓
include(url)
  ↓
Check if URL is service (YouTube, ggif)
  ↓ Yes: Skip validation
  ↓ No: Preload image
  ↓
Get dimensions (width × height)
  ↓
Save to database
  ↓
Build thumbnail (pix.build)
  ↓
Insert into carousel
  ↓
supportEvents() - add drag-drop
  ↓
resize() - fit to height
  ↓
updateView() - save item order
```

### Dragging Item
```
User clicks and drags thumbnail
  ↓
drag("init") - toggle class
  ↓
drag("start") - create proxy, start velocity tracking
  ↓
drag(move) - update position
  ↓
  Horizontal: scroll carousel
  Vertical: show reorder animation
  Cross-carousel: show proxy
  ↓
drag("end") - cleanup
  ↓
  Apply momentum if velocity > threshold
  Update view in database
```

### Loading View
```
onTag(tag) called
  ↓
Parse tag for path and owner
  ↓
loadView(path, owner)
  ↓
Query database for view
  ↓ Found: setView()
  ↓ Not found: loadPublic()
  ↓
setView(view)
  ↓
Identify missing items
  ↓
Load missing items from DB
  ↓
spread(items) - add all
  ↓
push(id) for each item
  ↓
Build and append thumbnails
```

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading**: Only loads items when view is displayed
2. **Item Caching**: Stores loaded items in `Pix.items[id]`
3. **Batch Operations**: `spread()` adds multiple items efficiently
4. **Momentum Scrolling**: RequestAnimationFrame for smooth 60fps
5. **Dimension Caching**: Stores width/height to avoid recalculation
6. **Event Delegation**: Could be improved (currently per-thumbnail)

### Performance Bottlenecks
- Individual event handlers on each thumbnail
- No virtual scrolling for large collections
- Synchronous resize operations
- No throttling on drag events
- Image preloading blocks UI

## Browser Compatibility

### Required Features
- jQuery 1.7+
- FileReader API (for uploads)
- ArrayBuffer support
- RequestAnimationFrame
- Canvas API (for GIF playback)
- Drag-and-drop events
- WebSocket (for uploads)

### Platform-Specific
- **Chrome Extension**: Uses chrome.storage API
- **Electron**: Full file system access
- **Web**: Limited to fetch/CORS
- **IPFS**: Requires local gateway at 127.0.1:8080

## Common Usage Patterns

### Creating Basic Carousel
```javascript
var carousel = new Carousel({
  name: 'images',
  preloadLocal: true
});
$('#container').append(carousel.$t);
carousel.onTag('nature');
```

### Adding Images
```javascript
// From URL
carousel.include('https://example.com/image.jpg');

// From another view
carousel.prependView('animals');

// Auto-fill from search
carousel.fill('mountains');
```

### View Management
```javascript
// Load user's view
carousel.onTag('topic@username');

// Load public view
carousel.onTag('topic@');

// Save current state
carousel.saveView();

// Update after reordering
carousel.updateView();
```

### Drag-Drop Upload
```javascript
// Files automatically handled by allowUpload()
// Just drop files onto carousel

// Programmatic upload
carousel.upload(dropEvent);
```

### Querying Items
```javascript
// Get all URLs
var urls = carousel.list();

// Get all IDs
var ids = carousel.getIds();

// Export as JSON
var json = carousel.exportJSON();
```

## Error Handling

### Image Load Failures
- `img.onerror` removes thumbnail
- Falls back to website scraping for metadata
- Logs error to console
- Cleans up drag-drop targets

### Upload Failures
- Removes preview thumbnail
- Logs error to console
- No retry mechanism

### View Load Failures
- Falls back from private → public → fill()
- Empty carousel if all fail
- No error message to user

## Dependencies

- **jQuery** - DOM manipulation and events
- **Pix** - Core library (build, send, items cache)
- **Cfg** - Global configuration
- **User** - Current user info
- **pix** - Global pix instance
- **ws** - WebSocket connection
- **ipfs** - IPFS client (optional)
- **parseQS** - Query string parser
- **isURL** - URL validator
- **$.event.special.drop** - Drag-drop library (dubmedia)

## Future Enhancements

1. **Virtual Scrolling**: Only render visible thumbnails
2. **Event Delegation**: Single handler for all thumbnails
3. **Lazy Image Loading**: Load images as they enter viewport
4. **Undo/Redo**: Track view changes for rollback
5. **Keyboard Navigation**: Arrow keys for selection/scrolling
6. **Touch Support**: Mobile-friendly gestures
7. **Accessibility**: ARIA labels and keyboard support
8. **Conflict Resolution**: Handle concurrent edits
9. **Offline Support**: Queue operations when disconnected
10. **Progressive Enhancement**: Work without JavaScript

## Security Considerations

- No input sanitization on URLs
- XSS risk from text overlays
- CORS limitations for cross-origin images
- No rate limiting on fills
- File upload size not checked
- No validation of file types beyond MIME
- Database commands sent from client

## Related Files

- `pix.js` - Core library with build() and send()
- `pix8.js` - Application initialization
- `modules/ggif.js` - Animated GIF support
- `config.yaml` - Configuration settings
- `server/api.js` - Backend API handlers
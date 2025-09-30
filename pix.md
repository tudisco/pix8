# PIX.md - Function Documentation

This document provides a comprehensive overview of the Pix module functions and their purposes.

## Module Overview

Pix is the core image management library that powers the pix8 application. It provides the foundational functionality for building thumbnails, managing carousels, handling data synchronization, and integrating with various media platforms (YouTube, ggif.co, local files). The module supports Chrome Extension, Electron, and Web platforms with offline capabilities through IndexedDB.

## Core Functionality

1. **Thumbnail Building** - Creates DOM elements for images, videos, and GIFs
2. **Data Management** - Handles item caching, preloading, and database operations
3. **Communication** - WebSocket and Chrome extension messaging with offline support
4. **Video Integration** - Embeds YouTube and Vimeo videos
5. **GIF Processing** - Custom GIF parser with canvas-based playback
6. **Layout Management** - Fixed element positioning and gap adjustments
7. **Search Integration** - Google Image Search API connectivity
8. **URL Parsing** - Extracts image URLs and video metadata

## Configuration Properties

```javascript
{
  exts: ['jpg', 'jpeg', 'gif', 'png', ...],  // Supported image extensions
  thumbH: 200,                                 // Default thumbnail height (px)
  drag: false,                                 // Drag-and-drop state flag
  def: 'pix8',                                 // Default namespace
  tid: 449,                                    // Template/theme ID
  api: '2.pix8.co:25286/',                    // Server API endpoint
  thumber: 'http://io.cx/thumb/',             // Thumbnail service URL
  heights: {                                   // Carousel height layouts
    1: [100],                                  // 1 carousel = 100% height
    2: [70,30],                                // 2 carousels = 70% + 30%
    3: [50,30,20],                             // 3 carousels = 50% + 30% + 20%
    4: [45,28,17,10]                           // 4 carousels
  }
}
```

## Data Structures

### Item Object
```javascript
{
  id: number,           // Unique item ID
  src: string,          // Source URL or file path
  file: string,         // Local file identifier
  href: string,         // Link destination
  text: string,         // Text overlay content
  tags: array,          // Associated tags
}
```

### Thumbnail Element
```html
<span class="thumb [youtube|ggif|file]"
      href="[url]"
      name="item[id]">
  <img|iframe|canvas>   <!-- Media element -->
  <article>text</article>  <!-- Optional text overlay -->
  <div class="n"></div>    <!-- Notification placeholder -->
  <div class="iframe-cover"></div>  <!-- Drag-drop helper -->
</span>
```

## Function Documentation

### Core Building Functions

#### `build(d)`
**Purpose**: Build a thumbnail DOM element for an item
**Parameters**:
- `d` (Object|string) - Item data object or URL string
  - `d.src` (string) - Source URL of the item
  - `d.file` (string) - Local file identifier
  - `d.id` (number) - Unique item ID
  - `d.text` (string) - Optional text overlay
  - `d.href` (string) - Link destination
**Returns**: jQuery element - Thumbnail span element
**Description**: Creates thumbnail elements with support for:
- Regular images (PNG, JPG, GIF)
- YouTube video embeds
- ggif.co iframe embeds
- Local file loading with GIF parsing

**Implementation Details**:
- Normalizes string URLs to object format
- Parses video URLs to detect YouTube/Vimeo
- Creates iframe covers to prevent drag interference
- Handles image loading success/failure
- Stores item data in DOM via jQuery `.data()`
- Caches built elements in `pix.$items[id]`

#### `build(item)` (Alternate)
**Purpose**: Alternative build method using Elem class
**Parameters**:
- `item` (Object) - Item data
**Returns**: jQuery element - Built item element
**Description**: Uses Elem class for building, providing alternative construction method.

#### `carousel(tag)`
**Purpose**: Create a new carousel instance
**Parameters**:
- `tag` (string) - Tag filter for carousel content
**Description**: Initializes Carousel with site images configuration and appends to Pix.$pic container.

#### `appendText(text, $thumb)`
**Purpose**: Add text overlay to a thumbnail element
**Parameters**:
- `text` (string) - Text content to display
- `$thumb` (jQuery) - Thumbnail element
**Returns**: jQuery element - Article element containing text
**Description**: Creates or updates `<article>` element inside thumbnail for text overlays.

### Data Management Functions

#### `preload(ids)`
**Purpose**: Preload items from database by IDs
**Parameters**:
- `ids` (Array<number>) - Array of item IDs to preload
**Returns**: Promise - Resolves when all items are loaded
**Description**:
- Filters out already-cached items
- Fetches missing items from server via `send()` command
- Populates `Pix.items` cache with results
- Used for batch loading to minimize server requests

#### `send(m, cb)`
**Purpose**: Send command to server via WebSocket or Chrome extension
**Parameters**:
- `m` (Object) - Message object
  - `m.cmd` (string) - Command: 'get', 'load', 'update', etc.
  - `m.filter` (Object) - MongoDB-style query filter
  - `m.collection` (string) - Database collection name
  - `m.set` (Object) - Update data (for update commands)
  - `m.id` (number) - Item ID (for specific operations)
- `cb` (Function) - Callback receiving response
**Returns**: void
**Description**: Multi-mode communication handler with three strategies:

1. **Online Mode (no IndexedDB)**: Direct WebSocket pass-through
2. **Offline Mode - Updates**: Local IndexedDB update + sync when session exists
3. **Offline Mode - Queries**: Return cached data, fetch from server if missing

Platform routing:
- WebSocket (`ws` instance) - Web/Electron
- Chrome runtime messaging - Extension
- Error if no communication channel available

#### `download(id, cb)`
**Purpose**: Download a file (currently incomplete implementation)
**Parameters**:
- `id` (number) - File ID to download
- `cb` (Function) - Callback function
**Description**: Placeholder for file download via XMLHttpRequest blob handling or WebSocket/Chrome extension routing.

#### `unusedIds()`
**Purpose**: Find all item IDs in cache not currently displayed in carousels
**Returns**: Array<number> - Array of unused item IDs
**Description**: Scans `pix.items` cache and checks DOM for `span[name=itemN]` elements to identify orphaned items.

### File Loading Functions

#### `loadFile(fid, $thumb)`
**Purpose**: Load a file and render it as an animated GIF if applicable
**Parameters**:
- `fid` (string) - File identifier
- `$thumb` (jQuery) - Thumbnail element to populate
**Description**:
- Loads image from `Cfg.files + fid`
- Parses GIF frames using custom Gif class
- Replaces static image with canvas player
- Adds click-to-play with audio support
- Handles carousel resize on load

#### `stopGgifs()`
**Purpose**: Pause all playing animated GIFs in the carousel area
**Description**: Iterates through all `#pic canvas.gif` elements and calls `.pause()` on associated gif instances.

### Media Integration Functions

#### `parseVideoURL(url)`
**Purpose**: Parse video URL and extract provider and video ID
**Parameters**:
- `url` (string) - Video URL
**Returns**: Object - `{provider: 'youtube'|'vimeo', id: string}` or empty object
**Description**:
- Detects YouTube URLs (youtube.com, youtu.be, embed format)
- Detects Vimeo URLs
- Extracts video ID from various URL formats
- Returns structured video data for embed creation

**Supported URL Patterns**:
```
YouTube:
- https://www.youtube.com/watch?v=VIDEO_ID
- https://youtu.be/VIDEO_ID
- https://www.youtube.com/embed/VIDEO_ID

Vimeo:
- https://vimeo.com/VIDEO_ID
```

#### `parseURL(url)`
**Purpose**: Parse and normalize URL, extracting actual image URL from query strings
**Parameters**:
- `url` (string) - URL to parse
**Returns**: string - Extracted or original URL
**Description**: Extracts `imgurl` parameter from Google Images URLs and other services that encode actual URLs in query strings.

### Search Functions

#### `searchGoogle(q, cb)`
**Purpose**: Search Google Images using Custom Search API
**Parameters**:
- `q` (string) - Search query
- `cb` (Function) - Callback receiving array of image URLs
**Description**:
- Uses Google Custom Search API with image filter
- API key and search engine ID configured in `pix.gImages`
- Returns array of image URLs from search results

#### `spider.getImgUrl(url)`
**Purpose**: Get full-resolution image URL from thumbnail or page URL
**Parameters**:
- `url` (string) - Image or page URL
**Returns**: string - Full resolution image URL
**Description**: Converts thumbnail URLs to full-size for:
- **imgur.com**: Adds .jpg extension to page URLs
- **wikimedia**: Removes /thumb/ path segments

#### `spider.getImages(url)`
**Purpose**: Scrape all images from a webpage URL
**Parameters**:
- `url` (string) - Page URL to scrape
**Returns**: Promise<Array<string>> - Promise resolving to array of image URLs
**Description**:
- Fetches HTML via $.get()
- Parses DOM for `<img>` tags
- Processes each URL through `getImgUrl()`
- Returns array of full-resolution URLs

### Layout & Positioning Functions

#### `collectFixed()`
**Purpose**: Collect all fixed and absolute positioned elements on page
**Description**:
- Filters page for elements with `position: fixed` or `position: absolute` (without relative parents)
- Stores original `top` positions in `data('_pix8-top')`
- Saves body margin-top as `Pix.marginBody`
- Used to adjust page layout when carousel overlay is shown

#### `isRelative($el)`
**Purpose**: Check if element has relatively positioned parent
**Parameters**:
- `$el` (jQuery) - Element to check
**Returns**: boolean - True if has relative/fixed/absolute parent
**Description**: Traverses parent chain to determine if element positioning is relative to a parent rather than document.

#### `leaveGap(px)`
**Purpose**: Adjust fixed elements and body margin to leave gap at top
**Parameters**:
- `px` (number) - Pixels of gap to leave
**Description**:
- Offsets all fixed elements by `px` pixels
- Increases body margin-top by `px` pixels
- Used to make room for carousel overlay without covering page content

#### `restoreGap()`
**Purpose**: Restore fixed elements and body margin to original positions
**Description**: Resets all layout adjustments made by `leaveGap()` to restore original page appearance.

#### `transform(px)`
**Purpose**: Apply CSS transform to body element (currently unused)
**Parameters**:
- `px` (number) - Pixels to translate vertically
**Description**: Alternative layout adjustment method using CSS transforms instead of margin/position changes.

#### `resize(newH)`
**Purpose**: Resize carousel container (currently disabled)
**Parameters**:
- `newH` (number) - New height in pixels
**Description**: Legacy function for resizing carousel heights with min/max constraints (30-800px).

### View Management Functions

#### `onLoad()`
**Purpose**: Called when page loads - handles authentication or loads default view
**Description**:
- Checks for `pix.authData`
- Calls `onAuth()` if authenticated
- Falls back to `loadView()` if not authenticated

#### `onAuth(auth)`
**Purpose**: Handle user authentication, update UI with user info
**Parameters**:
- `auth` (Object) - Authentication data object
  - `auth.username` (string) - Username
  - `auth.name` (string) - Display name
  - `auth.twitter` (Object) - Twitter profile data (optional)
**Description**:
- Updates #acc-name with username
- Shows account UI, hides auth UI
- Loads Twitter profile image if available
- Triggers user's stream view if exists

#### `makeMyFirst(id)`
**Purpose**: Make an item the first item in current user's view
**Parameters**:
- `id` (number) - Item ID to make first
**Description**:
- Gets current username from UI
- Fetches user's view for current path
- Sends `makeFirst` command to server
- Used for user-specific content ordering

#### `loadDepictions(search)`
**Purpose**: Load and display public depictions/views matching search criteria
**Parameters**:
- `search` (string) - Search regex pattern (optional)
**Description**:
- Queries 'views' collection for public items
- Filters by path using regex
- Sorts by updated date
- Displays results in #depictions sidebar

### Utility Functions

#### `phi(a, b)`
**Purpose**: Generate Fibonacci-like sequence starting with a, b until sum >= 100
**Parameters**:
- `a` (number) - First number in sequence
- `b` (number) - Second number in sequence
**Returns**: Array<number> - Sequence array
**Description**: Used for proportional layout calculations inspired by golden ratio. Each subsequent number is sum of previous two.

#### `cleanTargets()`
**Purpose**: Clean up orphaned drag-drop targets
**Description**: Fixes dubmedia drag&drop bug by removing targets from `$.event.special.drop.targets` array that no longer have parent elements.

#### `cleanByUrl(url)`
**Purpose**: Remove all thumbnails with a specific URL from carousels
**Parameters**:
- `url` (string) - URL to match and remove
**Description**: Removes all `span[href='url']` elements from #carousels container.

#### `checkVisible()`
**Purpose**: Count visible carousels and store in pix.visible
**Description**: Updates `pix.visible` property with count of visible carousel elements.

#### `checkPath(hash)`
**Purpose**: Extract and normalize pathname from current URL
**Parameters**:
- `hash` (string) - Unused parameter (legacy)
**Returns**: string - Normalized pathname
**Description**: Returns lowercase pathname without leading/trailing slashes.

#### `hash()`
**Purpose**: Get current hash from URL without # prefix
**Returns**: string - Hash value
**Description**: Returns URL hash without leading # and without trailing slashes.

#### `buildSwitch()`
**Purpose**: Build a tag/hash switch UI element (legacy)
**Returns**: jQuery element - Switch element
**Description**: Creates input field for hash tag switching (legacy functionality).

#### `checkJquery()`
**Purpose**: Check jQuery version and revert if too old (< v2)
**Description**: Calls `$.noConflict(true)` if jQuery version is below 2.0 to prevent conflicts.

#### `streams()`
**Purpose**: Collect all active stream objects from DOM
**Returns**: Array - Array of stream objects
**Description**: Iterates through `#streams > .stream` elements and collects their `.stream` properties.

### Animation Functions

#### `anim.easeOutExpo(currentIteration, startValue, changeInValue, totalIterations)`
**Purpose**: Exponential ease-out animation curve
**Parameters**:
- `currentIteration` (number) - Current step in animation
- `startValue` (number) - Starting value
- `changeInValue` (number) - Total change in value
- `totalIterations` (number) - Total animation steps
**Returns**: number - Interpolated value
**Description**: Easing function using exponential decay for smooth deceleration animations.

## Event Handlers

### Keyboard Shortcuts

Bound to `$(document).keydown()`:

| Key | Action |
|-----|--------|
| 1 / Numpad 1 | Set main carousel to 10vh height |
| 2 / Numpad 2 | Set main carousel to 25vh height |
| 3 / Numpad 3 | Set main carousel to 60vh height |
| 4 / Numpad 4 | Show only first 4 carousels |
| 5 / Numpad 5 | Show only first 5 carousels |
| 6 / Numpad 6 | Show only first 6 carousels |
| ESC | Stop all GIF playback |

**Note**: Only active when no input fields are focused.

### Paste Handler

Bound to `$(document).paste()`:

**Purpose**: Add images/URLs to focused carousel
**Behavior**:
- Ignores paste when input fields are focused
- Handles text URLs (http/https)
- Handles image clipboard data (screenshots)
- Requires active carousel with `.focus` class
- Requires focused thumbnail within carousel
- Calls `carousel.include(url)` for URLs
- Calls `carousel.upload(event)` for image data

### Mouse Events

#### `.ggif,.youtube` mouseleave
**Purpose**: Show iframe cover on mouseleave to re-enable drag functionality
**Description**: Without this, iframes capture mouse events and break drag-and-drop. Shows `.iframe-cover` div when mouse leaves embedded content.

## Data Storage

### Cache Objects

```javascript
pix.items = {}          // Item data cache (id => item object)
pix.$items = {}         // jQuery element cache (id => $element)
pix.carousels = []      // Array of carousel instances
pix.files = []          // Local file list
pix.loaded = []         // Loaded view IDs
```

### Callback Arrays

```javascript
pix.ready = []          // Callbacks for app ready
pix.onSession = []      // Callbacks for session established
```

### Default View Structure

```javascript
pix.defaultView = {
  id: -1,
  items: [],
  carousels: [
    {items:[], rate: 4, num: 2},   // Fastest carousel, 2 items
    {items:[], rate: 3, num: 4},   // Fast carousel, 4 items
    {items:[], rate: 2, num: 8},   // Medium carousel, 8 items
    {items:[], rate: 1, num: 16}   // Slow carousel, 16 items
  ]
}
```

## Platform Compatibility

### WebSocket Mode (Web/Electron)
- Uses global `ws` instance (WS class)
- Direct server communication
- Optional IndexedDB offline support via `dbz`

### Chrome Extension Mode
- Uses `chrome.runtime.sendMessage()`
- Routes through background page
- Message format: `{cmd: 'ws', d: message}`

### Offline Mode (IndexedDB)
- Enabled when `window.dbz` exists
- Caches get/load operations
- Queues updates for sync when online
- Auto-syncs when `Pix.session` established

## Initialization Sequence

```javascript
$(document).ready(() => {
  1. Pix.checkJquery()              // Version compatibility
  2. Pix.collectFixed()             // Collect fixed elements
  3. Pix.leaveGap(height)           // Adjust layout
  4. $.drop({mode:true})            // Enable drag-drop
  5. Bind keyboard shortcuts
  6. Bind paste handler
  7. Bind mouse events
});
```

## API Endpoints

### Server Communication

```javascript
// WebSocket commands
{cmd: 'get', filter: {}, collection: 'items'}     // Get single item
{cmd: 'load', filter: {}, collection: 'items'}    // Get multiple items
{cmd: 'update', id: N, set: {}, collection: ''}   // Update item
{cmd: 'makeFirst', idView: N, idItem: N}          // Reorder items
{cmd: 'download', id: N}                           // Download file
```

### External Services

- **Google Custom Search**: `pix.gImages + query`
- **Thumbnail Service**: `pix.thumber + url`
- **YouTube Thumbnails**: `http://img.youtube.com/vi/{id}/sddefault.jpg`
- **YouTube Embeds**: `http://www.youtube.com/embed/{id}`
- **Vimeo Embeds**: `http://player.vimeo.com/video/{id}`

## Dependencies

- **jQuery** - DOM manipulation and AJAX
- **Carousel** - Main carousel component
- **Gif** - Custom GIF parser/player
- **WS** - WebSocket wrapper class
- **Cfg** - Global configuration object
- **dbz** - IndexedDB wrapper (optional)
- **Elem** - Alternative element builder (optional)

## Error Handling

### Image Loading Failures
- `image.onerror` - Removes failed thumbnail, cleans targets
- `frame.onerror` - Removes failed iframe, expands carousel

### Network Failures
- Falls back to IndexedDB cache if available
- Queues operations for sync when online
- Logs errors to console

### Missing Dependencies
- `console.error('No way to interact with server')` if no WS or Chrome runtime

## Performance Optimizations

1. **Caching**: Items stored in `pix.items` to avoid redundant fetches
2. **Lazy Loading**: Only fetches items when needed via `preload()`
3. **Batch Operations**: `preload()` fetches multiple items in one request
4. **DOM Caching**: Built elements stored in `pix.$items`
5. **Offline Support**: IndexedDB reduces server round-trips

## Security Considerations

- Google API key exposed in client code (`pix.gImages`)
- No input sanitization visible in URL parsing
- HTTPS upgrade for ggif.co iframes
- Cross-origin iframe content (YouTube, Vimeo)

## Usage Examples

### Basic Thumbnail Creation
```javascript
var thumb = pix.build({
  id: 123,
  src: 'https://example.com/image.jpg',
  text: 'Example Image'
});
$('#carousel').append(thumb);
```

### Preloading Items
```javascript
pix.preload([101, 102, 103]).then(() => {
  console.log('Items loaded:', pix.items);
});
```

### Server Communication
```javascript
pix.send({
  cmd: 'load',
  filter: {tags: {$in: ['nature']}},
  collection: 'items'
}, response => {
  console.log('Loaded items:', response.items);
});
```

### Video Parsing
```javascript
var video = pix.parseVideoURL('https://youtube.com/watch?v=dQw4w9WgXcQ');
// Returns: {provider: 'youtube', id: 'dQw4w9WgXcQ'}
```

## Future Enhancements

- Complete `download()` implementation
- Add input sanitization for URL parsing
- Implement `addWord()` functionality
- Add retry logic for failed network requests
- Implement request debouncing for rapid operations
- Add WebP support to `exts` array
- Secure API key storage for Google Search
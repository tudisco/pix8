# PIX8.md - Function Documentation

This document provides a comprehensive overview of the Pix8 module functions and their purposes.

## Module Overview

Pix8 is the primary application interface that orchestrates the image carousel system, site navigation, and user interaction. It creates a unified interface for browsing, organizing, and managing visual content across websites, Wikipedia articles, and user-generated collections.

## Core Functionality

1. **Application Initialization** - Sets up the main UI components and layout
2. **Carousel Management** - Creates and manages multiple image carousels
3. **Site Navigation** - Handles URL routing and website integration
4. **Search Interface** - Provides search across words, sites, and content
5. **Input Processing** - Manages user input for URLs, tags, and commands
6. **Browser Integration** - Electron/Chrome extension compatibility
7. **Content Organization** - Organizes content by words, sites, and collections

## UI Structure

```
[Header Bar]
  - Menu Button (☰)
  - URL Input Field
  - Window Controls (Electron: Dev Tools, Minimize, Close)

[Carousels] (Dynamic)
  - Main Site Carousel
  - Additional Word/Topic Carousels
  - Each carousel shows related images

[Input Area]
  - Tag/URL Input Field
  - Drag-to-resize functionality

[Side Panel] (Toggleable)
  - Search Results
  - Word/Topic List
  - Site History
```

## Function Documentation

### Core Initialization Functions

#### `init(cfg)`
**Purpose**: Initializes the Pix8 application with UI components and event handlers
**Parameters**:
- `cfg` (Object) - Configuration options for initialization
**Description**: Main application setup function that creates the UI structure, initializes components, and sets up event handlers.

#### `initCarousel()`
**Purpose**: Initializes the main site carousel
**Description**: Creates the primary carousel for displaying site-related images with callbacks for handling image additions.

#### `initInput()`
**Purpose**: Initializes the main input field for tags/URLs and drag-resize functionality
**Description**: Creates the input area at the bottom of the interface with focus/blur styling and enter key handling for creating new carousels.

#### `initList()`
**Purpose**: Initializes the side panel/menu system
**Description**: Creates the toggleable list for words, sites, and search with lazy initialization on first open.

### Layout & Resizing Functions

#### `resize()`
**Purpose**: Handles window and layout resizing
**Description**: Adjusts page heights, body margins, and carousel layouts. Called when carousels are added/removed or window size changes.

#### `enableInputDrag()`
**Purpose**: Enables drag-to-resize functionality on the input field
**Description**: Allows users to resize carousel heights and adjust scroll positions by dragging the input field vertically.

### Navigation & URL Handling Functions

#### `getUrl()`
**Purpose**: Extracts the actual URL from the current location
**Returns**: String - The processed URL
**Description**: Handles special preloader domains that encode URLs in paths and converts single words to Wikipedia URLs.

#### `getLink(path)`
**Purpose**: Converts a path/URL into a Link object for data storage
**Parameters**:
- `path` (string) - URL, word, or DAT link
**Returns**: Link object for accessing stored data
**Description**: Maps different input types to appropriate storage locations using DAT/IPFS links.

#### `onSite(url)`
**Purpose**: Handles navigation to a website/URL
**Parameters**:
- `url` (string) - URL to navigate to
**Description**: Loads site data into the main carousel and updates UI components.

#### `parseTag(url)`
**Purpose**: Parses user input and creates appropriate carousel
**Parameters**:
- `url` (string) - User input to parse
**Description**: Handles URLs, words, and other tag types by creating new carousels.

### Search & Discovery Functions

#### `createIndex()`
**Purpose**: Creates a search index for words and sites using ElasticLunr
**Description**: Indexes both word collections and site metadata for fast searching across user's content.

#### `search(q)`
**Purpose**: Searches the index and displays results in the side panel
**Parameters**:
- `q` (string) - Search query string
**Description**: Auto-opens menu if hidden and displays matching results with click handlers.

#### `clickResult(ev)`
**Purpose**: Handles clicks on search results
**Parameters**:
- `ev` (Event) - Click event
**Description**: Routes to appropriate handler based on result type (site or word) and creates new carousels.

### Content Management Functions

#### `loadWords(id)`
**Purpose**: Loads and displays user's word collections
**Parameters**:
- `id` (string, optional) - Optional specific word ID to load
**Description**: Fetches list from DAT storage and creates clickable tags for each word collection.

#### `addTag(word)`
**Purpose**: Adds a word tag to the words list
**Parameters**:
- `word` (string) - Word to add as clickable tag
**Description**: Creates and prepends a clickable tag element to the words list.

#### `buildTag(word)`
**Purpose**: Creates a clickable tag element for a word
**Parameters**:
- `word` (string) - Word to create tag for
**Returns**: jQuery element - Clickable tag element
**Description**: Builds the HTML element with click handler for word tags.

#### `clickTag(ev)`
**Purpose**: Handles clicks on word/site tags in the side panel
**Parameters**:
- `ev` (Event) - Click event
**Description**: Creates new carousel for the selected item and updates URL field if applicable.

### Platform-Specific Functions

#### `iniElectron()`
**Purpose**: Initializes Electron-specific window controls
**Description**: Adds dev tools (<>), minimize (-), and close (×) buttons to header for desktop app functionality.

#### `initBrowser()`
**Purpose**: Initializes browser window iframe for Electron app
**Description**: Creates embedded browser for site navigation with load event handling.

#### `initGgif()`
**Purpose**: Initializes GGIF (enhanced GIF) iframe for media creation
**Description**: Creates full-page iframe for GIF creation interface.

### Site Management Functions

#### `siteLoaded(site)`
**Purpose**: Handles site loading completion in browser iframe
**Parameters**:
- `site` (Object) - Site object with metadata
**Description**: Extracts site metadata and associates with carousel, creating new site items if needed.

#### `initSites()`
**Purpose**: Initializes the sites section of the side panel
**Description**: Creates container for site history and bookmarks with legacy loading functionality.

#### `addSite(link, url)`
**Purpose**: Adds a site to the sites list with associated link
**Parameters**:
- `link` (string) - Storage link for site data
- `url` (string) - Site URL
**Returns**: jQuery element - Created site element
**Description**: Maps site URLs to storage links and creates clickable list items.

### Utility & Helper Functions

#### `logSite(link, site)`
**Purpose**: Logs site navigation activity to user's activity log
**Parameters**:
- `link` (string) - Site link identifier
- `site` (string) - Site URL or identifier
**Description**: Records navigation activity to user's personal log, skipping file:// URLs.

#### `regPlus(handler, cb)`
**Purpose**: Registers a handler for plus commands
**Parameters**:
- `handler` (string) - Command name
- `cb` (Function) - Callback function
**Description**: Allows registration of custom plus command handlers (+command:value format).

#### `addWord()`
**Purpose**: Adds a new word to the user's collection
**Description**: Placeholder function for adding new word collections (implementation needed).

## Data Storage Objects

- `sites` - Site URL to link mappings
- `words` - Word collections cache
- `items` - Loaded items cache
- `onPlus` - Registry for plus command handlers
- `initiated` - Flag to track if side panel has been initialized

## Navigation Patterns

- **URL Input**: Navigate to websites, load site-specific image collections
- **Tag Input**: Create carousels for specific words/topics
- **Search**: Find existing words, sites, or content
- **Drag Resize**: Adjust carousel heights and scroll positions

## Data Management

Uses DAT/IPFS links for distributed storage:
- `Me.link + 'words'` → User's word collections
- `Me.link + 'sites'` → User's site collections
- MD5 hashing for site identification
- YAML format for metadata storage

## Platform Integration

- **Electron**: Window controls, file system access, native features
- **Chrome Extension**: Content script injection, browser integration
- **Web App**: Standard browser functionality with responsive design

## Workflow Examples

1. **Site Navigation**: Enter URL → Load site data → Display related images in carousel
2. **Word Exploration**: Enter word → Create new carousel → Load word-related content
3. **Wikipedia Integration**: Navigate to wiki page → Extract topic → Load related media
4. **Search & Discovery**: Open menu → Search term → Select result → Load content

## Dependencies

- `Carousel` - Image carousel component
- `Link` - DAT/IPFS link management
- `Me` - User identity and storage
- `Items` - Content item management
- `elasticlunr` - Search indexing
- jQuery - DOM manipulation
- md5 - URL hashing
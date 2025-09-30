# FILES.md

This document describes the purpose and responsibilities of each file in the pix8 codebase.

## Root Files

### Core Application
- **index.html** - Main web application entry point that loads all required libraries and modules
- **index.js** - Primary application initialization and startup script
- **pix8.js** - Main application module managing UI components, carousels, and search functionality
- **pix.js** - Core picture handling module with carousel management and image processing logic
- **carousel.js** - Carousel component implementation for displaying and interacting with image collections
- **integrate.js** - Website integration module for embedding pix8 functionality into external websites
- **background.js** - Chrome extension background script handling context menus and tab messaging

### Electron Desktop
- **run.js** - Electron application launcher and main process controller
- **electron.js** - Electron renderer process integration and system access
- **electron.html** - Electron-specific HTML entry point with desktop app layout
- **preload.js** - Electron preload script for security and API exposure

### Media Processing
- **youtube.js** - YouTube video downloading and audio extraction using ytdl-core and ffmpeg
- **youtube_dl.js** - YouTube download utilities and helper functions
- **dats.js** - DAT (Decentralized Archive Transport) protocol integration for distributed storage

### Configuration
- **config.js** - JavaScript configuration loader and settings management
- **config.yaml** - YAML configuration with storage paths, ffmpeg settings, and application preferences
- **package.json** - Node.js project configuration with dependencies and scripts
- **webpack.config.js** - Webpack bundling configuration for application building
- **manifest.json** - Chrome extension manifest defining permissions and background scripts

### Data Management
- **Catalog.js** - Data catalog management for organizing and accessing content collections
- **builds.js** - Build configuration and deployment utilities
- **sw.js** - Service worker for progressive web app functionality

### Documentation & Assets
- **README.md** - Project documentation and setup instructions
- **CLAUDE.md** - Guidance for Claude Code when working with this repository
- **logo.ico** - Application icon file
- **logo48.png** - 48px logo for extension/app icons
- **menu38.png** - Browser action menu icon

### Command Scripts
- **run.cmd** - Windows batch file to start the application
- **import.cmd** - Windows batch file for importing data
- **update.cmd** - Windows batch file for application updates
- **npm_install.cmd** - Windows batch file for dependency installation

## /modules/ Directory

### Core System
- **core.js** - Essential application core functionality and base utilities
- **interface.js** - UI interface management including modals, sidebars, and layout controls
- **central.js** - Central coordination module for application components
- **platform.js** - Platform detection and cross-platform compatibility layer
- **setup.js** - Application setup and initialization routines

### User & Authentication
- **acc.js** - User account management and authentication
- **auth.js** - Authentication handling and user session management
- **me.js** - Current user profile, settings, and personal data management

### Network & Communication
- **ws.js** - WebSocket client implementation for real-time communication
- **Link.js** - URL and link handling utilities with DAT protocol support
- **Link-ws.js** - WebSocket-based link management and synchronization

### Image & Media
- **images.js** - Image processing, manipulation, and optimization utilities
- **img.js** - Image handling and display logic
- **ggif.js** - Advanced GIF creation, compilation, and audio integration (22,902 lines)
- **video.js** - Video processing module for media handling

### Data Management
- **Catalog.js** - Data catalog and collection management system
- **dats.js** - DAT protocol implementation for decentralized storage
- **ipfs.js** - IPFS (InterPlanetary File System) integration for distributed files

### UI Components
- **builder.js** - UI component builder and item collection management
- **wysiwyg.js** - WYSIWYG editor for content editing and text manipulation
- **context.js** - Context menu and right-click functionality implementation

### Content Features
- **tags.js** - Content tagging and classification system
- **site.js** - Website integration and site-specific functionality
- **browse.js** - File browsing and navigation utilities

### Platform Integration
- **electron.js** - Electron-specific functionality and desktop integration
- **ext.js** - Chrome extension content script message handling
- **node.js** - Node.js environment utilities and helpers
- **link-electron.js** - Electron-specific link handling

### Media Processing
- **youtube_dl.js** - YouTube download integration module
- **builds.js** - Build and deployment functionality

## /libs/ Directory

### Core Libraries
- **jquery-2.js** - jQuery 2.x library for DOM manipulation
- **jquery.js** - Additional jQuery library version
- **underscore.js** - Underscore.js utility library for functional programming
- **functions.js** - Custom utility functions and extensions

### React Framework
- **react.production.min.js** - React library for building UI components
- **react-dom.production.min.js** - React DOM rendering library

### Image & Media
- **gif.js** - GIF format handling and processing
- **omggif.js** - GIF reader and encoder library
- **omggif_fixed.js** - Fixed version of omggif library with bug patches
- **binary.js** - Binary data manipulation utilities

### UI Interaction
- **jquery.event.drag.js** - jQuery drag event handling for drag-and-drop
- **jquery.event.drop.js** - jQuery drop event handling for drag-and-drop
- **Elem.js** - Custom DOM element utilities and helpers

### Data & Storage
- **js.cookie.js** - Cookie management library for browser storage
- **cookie.jquery.js** - jQuery cookie plugin for easier cookie handling
- **md5.js** - MD5 hashing algorithm implementation
- **elasticlunr.js** - Full-text search engine library for content indexing

### Utilities
- **download.js** - File download utilities for client-side downloads
- **data-ws.js** - WebSocket data handling utilities
- **URL.js** - URL parsing and manipulation utilities
- **tip.css** - Tooltip styling and layout definitions

## /design/ Directory

### Core Stylesheets
- **interface.css** - Main user interface styling (16,755 lines)
- **layout.css** - Application layout and positioning rules
- **carousel.css** - Carousel component styling and animations
- **images.css** - Image display and gallery styling

### Feature Stylesheets
- **game.css** - Game-related interface styling
- **acc.css** - Account and authentication UI styling
- **progress.css** - Progress indicator and loading animations
- **context.css** - Context menu styling and positioning

### Platform-Specific Styles
- **electron.css** - Electron desktop app specific styling
- **ext.css** - Chrome extension specific styling

### JavaScript
- **ggif.js** - GIF-related functionality within design context

### Image Assets
- **logo48.png** - Application logo (48px)
- **google.png** - Google-related graphics
- **microphone.png** - Microphone icon for audio features
- **play.png** - Play button icon
- **search.png** - Search functionality icon
- **user.png** - User profile icon
- **resize.png** - Resize handle icon

## /server/ Directory

### Main Server
- **api.js** - Main API server setup with global configurations and error handling
- **api.yaml** - API configuration and routing definitions
- **run.cmd** - Windows batch file to start the server

### /server/modules/ Directory
- **acc.js** - Server-side account management and user authentication (20,577 lines)
- **fs.js** - File system operations and storage management
- **query.js** - Database query handling and data operations
- **socket.js** - WebSocket server implementation for real-time communication
- **site.js** - Website-specific server functionality
- **functions.js** - Server utility functions and helpers
- **http.js** - HTTP request handling module

### Upload Storage
- **/server/upl/** - Upload directory for file storage

## /extension/ Directory

Chrome extension specific files (if present)

## /src/ Directory

### Source Files
- **index.js** - Source entry point module
- **/data/** - Data storage and management files

## Key File Relationships

1. **Application Flow**:
   - `index.html` → loads → `pix8.js` → initializes → `pix.js` + `carousel.js`
   - `run.js` → launches → `electron.html` → loads → `electron.js`

2. **Module Dependencies**:
   - Core modules (`core.js`, `interface.js`) are loaded first
   - Feature modules depend on core modules
   - Platform-specific modules loaded conditionally

3. **Data Flow**:
   - `config.yaml` → `config.js` → application configuration
   - `dats.js` + `Catalog.js` → distributed data management
   - `ws.js` + `socket.js` → real-time communication

4. **Media Processing Pipeline**:
   - `youtube.js` → downloads videos
   - `ggif.js` → creates animated GIFs
   - `images.js` → processes images

5. **User Interface Stack**:
   - HTML files → load styles from `/design/`
   - JavaScript modules → create UI components
   - `interface.js` + `builder.js` → dynamic UI generation
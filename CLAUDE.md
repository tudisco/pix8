# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

pix8 is a multi-platform image management application ("better pictures faster") that runs as a Chrome Extension, Electron Desktop App, and Web Application. It provides image carousel functionality with tagging, search, and distributed data storage using the DAT protocol.

## Commands

```bash
# Start the Electron application
npm start

# Manual execution scripts (Windows batch files)
run.cmd     # Run the application
import.cmd  # Import data
update.cmd  # Update the application
```

## Architecture

### Multi-Platform Structure
The codebase shares components across three platforms:
- **Chrome Extension**: `/extension/` and `manifest.json` - Chrome-specific integration with browser storage
- **Electron App**: Main entry via `run.js`, uses `electron-builder` for packaging
- **Web Application**: Served via Node.js server (`server/` directory)

### Module System
The application uses a custom module loading system (29 modules in `/modules/`):
1. **Libraries First**: jQuery, Underscore.js loaded before custom modules
2. **Configuration**: YAML-based config loaded early (`config.yaml`)
3. **Core Components**: `carousel.js`, `graphics.js`, `actions.js`
4. **Feature Modules**: `tagging.js`, `search.js`, `filters.js`, etc.
5. **Platform-Specific**: `platform.js` handles cross-platform compatibility

### Data Architecture
- **DAT Protocol**: User-owned distributed data storage (`dats.js` module)
- **Local Storage**: LowDB for local data persistence
- **Configuration**: YAML files with extension support (`../config.yaml` for user overrides)
- **WebSocket**: Real-time communication between components (`modules/ws.js`)

### Key Components

**Pix (Core Library - `pix.js`)**
- Base image management functionality
- Tag and search systems
- Data synchronization

**Pix8 (Application Layer - `pix8.js`)**
- Built on top of Pix
- Platform-specific implementations
- User interface management

**Carousel System (`carousel.js`)**
- Primary UI component for image display
- Drag-and-drop support
- Customizable through configuration

### Critical Files
- `run.js`: Electron app entry point
- `server/api.js`: Web server implementation
- `modules/carousel.js`: Core carousel functionality
- `modules/platform.js`: Platform detection and compatibility
- `config.yaml`: Main configuration file

## Configuration System

The application uses a hierarchical YAML configuration system:
1. Base config: `config.yaml`
2. User overrides: `../config.yaml` (parent directory)
3. Platform-specific settings applied at runtime

Key configuration areas:
- WebSocket settings
- DAT archive configuration
- UI customization options
- Platform-specific behaviors
- Storage paths (home, private, items, dats, wiki, youtubes)
- FFmpeg/FFprobe paths for media processing

## Module Loading Sequence

HTML files load modules in this specific order:
1. **Base Libraries**: jQuery, Underscore, utility functions
2. **Configuration**: Config loading and setup
3. **Core Modules**: User management, WebSocket, linking
4. **Feature Modules**: Interface, builder, context handling
5. **Application Logic**: Carousel, pix8 main functionality

## Platform Considerations

When modifying code, check platform compatibility:
- Use `modules/platform.js` for platform detection
- Test changes across Chrome extension, Electron, and web contexts
- WebSocket connections behave differently in each environment
- File system access limited in Chrome extension context
- Default configuration uses Windows paths - adjust for macOS/Linux
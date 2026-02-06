# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Versioning Strategy

- **Pre-1.0**: Minor version bumps for breaking changes, patch for fixes and features
- **Post-1.0**: Standard [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

## [0.1.0] - 2026-02-05

Initial release of blECSd, a modern terminal UI library built on ECS architecture.

### Added

#### Core ECS
- Entity Component System powered by bitecs with full TypeScript wrapper
- World creation, entity management, component registration
- Query system for filtering entities by components
- Scheduler with configurable loop phases (INPUT, UPDATE, LAYOUT, RENDER, etc.)
- World serialization and deserialization (JSON format)
- Scene management with transitions (fade, slide)
- Event bus with typed events and entity-scoped event buses

#### Components
- **Position**: 2D positioning with absolute/relative modes
- **Dimensions**: Width, height, constraints, shrink-to-fit
- **Renderable**: Character, foreground, background colors (packed RGBA)
- **Velocity & Acceleration**: Physics-based movement with friction
- **Border**: Single, double, rounded, bold, ASCII box-drawing styles
- **Padding**: Per-side padding values
- **Scrollable**: Scroll position, viewport size, scroll percentage tracking
- **Hierarchy**: Parent-child relationships, tree traversal
- **Content**: Text content with tag parsing and alignment
- **Style**: Foreground, background, bold, underline, blink attributes
- **Focusable**: Tab order, focus cycling, focus groups
- **Interactive**: Click, hover, drag, keyboard interaction modes
- **Label**: Positioned labels for form fields
- **Shadow**: Drop shadows with customizable offset, opacity, blending
- **Health**: HP tracking with regen and invulnerability
- **Behavior**: AI state machines (idle, patrol, chase, flee, custom)
- **StateMachine**: Generic state machine with transitions and guards
- **Timer**: Countdown and repeating timers with callbacks
- **TileMap**: Tile-based maps with layers, tilesets, and rendering
- **Particle & ParticleEmitter**: Particle effects with configurable emitters

#### Interactive Widgets (Component-based)
- **Button**: Press, hover, focus states with callbacks
- **Checkbox**: Check/uncheck with display customization
- **RadioButton & RadioSet**: Grouped radio selection
- **Select**: Dropdown with open/close, highlight, search
- **Slider**: Horizontal/vertical with range, step, drag support
- **TextInput**: Cursor modes (block, line, underline), secret mode, validation
- **List**: Virtualized scrolling, lazy loading, incremental search, multi-select
- **ProgressBar**: Horizontal/vertical with customizable fill characters
- **Form**: Field registration, tab order, validation, submit/reset

#### High-level Widgets
- **Box**: Borders, padding, content alignment, rendering
- **Text**: Multi-line text with word wrap and alignment
- **List Widget**: Full list widget with scrollbar and keyboard navigation
- **Listbar**: Horizontal command bar
- **Tabs**: Tabbed content panels
- **Viewport3D**: 3D rendering viewport widget
- **BigText**: Large ASCII art text with custom fonts
- **Table**: Row/column data display with sorting and selection
- **Tree**: Hierarchical tree view with expand/collapse
- **Panel**: Titled panel container
- **FileManager**: File system browser
- **Message**: Temporary notification display
- **Question**: Yes/no prompt dialog
- **Terminal**: Embedded terminal emulator with PTY support
- **Video**: Video playback via mplayer/mpv/ffplay
- **Image**: Terminal image display via Sixel, Kitty, W3M, ANSI

#### Systems
- **Input System**: Keyboard and mouse event processing with hit testing
- **Layout System**: Constraint-based layout with parent-child bounds
- **Render System**: Background, border, content, scrollbar rendering
- **Output System**: Double-buffered terminal output with ANSI generation
- **Animation System**: ECS-based velocity/position animation
- **Particle System**: Particle spawning, aging, physics
- **Behavior System**: AI behavior state machine processing
- **StateMachine System**: Generic state transition processing
- **TileMap Renderer**: Tile-based map rendering with camera

#### Terminal I/O
- Keyboard input parsing (standard keys, modifiers, special keys)
- Kitty keyboard protocol support
- Mouse event parsing (X10, SGR, URxvt protocols)
- Terminal focus events
- ANSI escape code generation
- Terminfo/tput capability detection
- Alternate screen buffer management
- Double-buffered screen output
- Terminal resize handling (SIGWINCH)
- Debug logging with configurable levels

#### 3D Subsystem
- Vector3 and Matrix4 math
- Triangle rasterization with depth buffer
- Shading (flat, vertex color)
- OBJ mesh loader
- Primitive mesh generators (cube, sphere, plane, cylinder, torus)
- Multiple rendering backends: braille, half-block, sextant, Sixel, Kitty
- 3D camera component and transform system
- Backend auto-detection based on terminal capabilities

#### Terminal Graphics
- Sixel image protocol support
- Kitty graphics protocol support
- ANSI 256-color image rendering
- PNG image parsing

#### Utilities
- Cell buffer for direct character/color manipulation
- Box rendering (renderBox, renderHLine, renderVLine, fillRect)
- Word wrapping with configurable options
- Tag-based text formatting (parse, strip, escape)
- Style attribute encoding/decoding (sattr)
- Fuzzy matching and search
- Incremental syntax highlighting (JS, Python, Rust, Go, Shell, JSON)
- Rope data structure for large text editing
- Virtual scrollback buffer with compression
- Virtualized line store for large content
- Strip ANSI escape codes utility
- Unicode string width calculation

#### Audio
- Audio integration hooks for game sound effects
- Audio channel management and mixing adapter interface

#### Game API
- High-level game creation with `createGame()`
- Fixed timestep update loop
- Key and mouse handler registration

#### Error Handling
- Typed error system with error codes per domain
- Result type (Ok/Err) with map, flatMap, unwrap utilities
- Error wrapping and cause chain tracking

#### Schemas
- Zod validation schemas for colors, dimensions, percentages
- Configuration validation at system boundaries

#### Debug Tools
- Entity inspection and world inspection
- Performance profiling with system timing
- Debug bounds overlay
- Frame rate graph
- Mini profiler
- Input logger

#### Examples
- 22 feature demos (animation, input, scrolling, widgets, etc.)
- Terminal Roguelike Game
- Markdown Viewer with Tree Navigation
- Interactive Form Builder
- Kanban Board with Drag-and-Drop
- 3D Cube Viewer
- 3D OBJ Model Viewer
- DVD Bounce Animation
- System Monitor Dashboard
- ASCII Clock
- Multiplexer Terminal
- File Manager
- Telnet Server

[unreleased]: https://github.com/Kadajett/blECSd/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Kadajett/blECSd/releases/tag/v0.1.0

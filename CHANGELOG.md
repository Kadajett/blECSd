# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Versioning Strategy

- **Pre-1.0**: Minor version bumps for breaking changes, patch for fixes and features
- **Post-1.0**: Standard [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [0.4.1] - 2026-02-13

### Added

#### Terminal Control Convenience Wrappers
- **`bell()`** - Ring the terminal bell without needing raw escape codes
- **`moveTo(x, y)`** - Move cursor to absolute position with OutputState tracking (0-indexed)
- **`enableMouseTracking(mode)`** - Enable mouse tracking with `'normal'`, `'button'`, or `'any'` modes; auto-enables SGR extended coordinates
- **`disableMouseTracking()`** - Disable all mouse tracking modes and SGR extended coordinates
- **`setCursorShape(shape)`** - Set cursor to `'block'`, `'underline'`, or `'bar'` via DECSCUSR
- **`setWindowTitle(title)`** - Set terminal window title via OSC 2
- **`beginSyncOutput()`** / **`endSyncOutput()`** - Synchronized output mode (DEC 2026) for atomic screen updates
- **`saveCursorPosition()`** / **`restoreCursorPosition()`** - DEC cursor save/restore

### Changed
- `OutputState` now tracks `mouseTracking`, `mouseMode`, and `syncOutput` state
- `cleanup()` now properly disables mouse tracking and ends synchronized output before restoring terminal state
- All new functions exported from `blecsd` package

## [0.4.0] - 2026-02-13

### Added

#### New Widgets
- **Calendar** widget with month/year navigation, date selection, min/max constraints, marked dates, week numbers, and keyboard navigation (#1066)
- **Multi-Select** widget with checkbox display, Space toggle, Ctrl+A select all, Shift+Arrow range selection, and filter-as-you-type (#1190)
- **Search Overlay** widget with regex/plain text modes, match highlighting, and next/prev navigation for scrollable content (#1190)
- **Searchable List** widget with inline filter enhancement, real-time filtering, and selection preservation (#1190)
- **Context Menu** widget with keyboard navigation, auto-positioning to avoid screen edges, disabled items, and separators (#1192)

#### Core Systems & Architecture
- **Spring Physics Animation System**: smooth spring-based animations with stiffness, damping, and precision config; includes bouncy, smooth, and snappy presets (#1192)
- **Constraint Layout System**: flexible layout computation with fixed, percentage, min, max, and ratio constraints; `layoutHorizontal` and `layoutVertical` functions (#1192)
- **Accessibility Foundation**: ARIA-like roles (button, checkbox, list, textbox, dialog, menu, tree), accessible labels, and `announce()` for screen reader notifications (#1192)
- **Plugin/Module System**: extensible architecture for bundling components, systems, and lifecycle hooks into reusable modules with dependency resolution and priority ordering
- **CSS-like Stylesheet System**: declarative style rules with selectors by widget tag, class, and entity ID; CSS-like specificity cascading with Zod validation
- **2D TUI Render Backend Abstraction**: pluggable `RenderBackend` interface with auto-detection
  - **AnsiBackend**: standard ANSI escape sequences with optimized cursor movement
  - **KittyBackend**: Kitty graphics protocol with synchronized output and image encoding

#### Performance
- **Lazy Query Cache for Packed Adapter**: 320x sync performance improvement (43k to 14M+ ops/sec at 1k entities); `sync()` now stores world ref and bumps frame counter at near-zero cost; unified render system to single indexed-iteration path

#### Documentation
- Terminal app patterns guide covering command palettes, search overlays, status bars, focus management, and event-driven architecture

### Changed
- Reduced cognitive complexity across 14+ files to pass Biome lint threshold (max 15); extracted helpers in scheduler, testing/helpers, sparkline, textarea, lineChart, accordion, grid, and more (#1191)
- Refactored `EntityValidationError` from class to functional style (`createEntityValidationError` factory + `isEntityValidationError` guard)
- Corrected VERSION constant to match package.json
- Cleaned up barrel exports with collision ownership comments

### Fixed
- Biome lint errors reduced from 32 warnings to 0 (#1191)
- Non-null assertion errors in `fuzzySearch.ts` and `chartUtils.ts` replaced with proper typing

### Removed
- Local `examples/` directory (previously migrated to external repo, now fully removed)

## [0.3.0] - 2026-02-09

### Added

#### New Widgets
- **Textarea** and **Textbox** input widgets (#1079)
- **Button**, **Checkbox**, and **RadioButton** form widgets (#1080)
- **Form** and **ProgressBar** widgets (#1083)
- **LineChart**, **BarChart**, **Sparkline**, and **Gauge** data visualization widgets (#1085)
- **Switch** and **Toast** widgets
- **Header** and **Footer** widgets for persistent UI chrome (#1057)
- **Accordion** and **Collapsible** widgets (#1058)
- **Autocomplete** widget with fuzzy matching (#1060)
- **Markdown** widget for rich text rendering (#1037)
- **Canvas** widget for custom shape drawing (#1070)
- **Command Palette** widget (#1074)
- **Timer** and **Stopwatch** widgets (#1067)
- **Stacked bar chart** and block characters (#1069)

#### Layout Systems
- **Grid** layout system (#1065)
- **Flexbox** layout system (#1072)

#### Developer Experience
- **DevTools** inspector for runtime ECS state inspection (#1063)
- **Debug mode** with F12 console for runtime debugging (#993)
- ECS state inspection utilities (#954)
- Entity validation utilities with descriptive error messages (#940)
- TypeScript autocomplete improvements for common widget patterns (#946)
- TypeScript playground for experimentation (#1044)
- Enhanced snapshot testing utilities with visual diff reporting (#1048)

#### Components & Core
- `UserData` component for arbitrary entity data storage
- `emitDescendants()` for downward event propagation (#1111)
- `tabSize` option for tab character width (#1100)
- Element enable/disable state and position keywords (#1084)
- Absolute positioning helpers for screen-edge anchoring
- Terminal focus tracking with CSI ? 1004 h/l sequences
- Screen warning events and logging (#1106)
- Terminal widget PTY mode configuration (#1050)
- Theme system for centralized styling and color palettes (#1076)
- Text tags/markup system for inline styling (#1075)
- Scrollbar rendering and dashed border styles (#1082)
- List activation callbacks, multi-select, fuzzy search, and Table column config (#1081)
- Word navigation and validation for text inputs
- Basic syntax highlighting for terminal code display (#1062)
- FileManager directory navigation and file operations (#1054)

#### Schemas
- Zod validation for 10 config interfaces (#884)
- Zod validation for 11 additional config interfaces (#1118)

#### Performance & Benchmarks
- Full-stack render cycle benchmark with frame time breakdown (#969)
- Memory profiling and GC pressure tracking benchmarks (#970)
- Startup time and time-to-first-render benchmarks (#971)
- Layout system performance benchmarks (#974)
- Animation system performance benchmarks (#976)
- Text rendering performance benchmarks (#978)
- Real-world scenario benchmarks (#1026)
- CI performance regression gates (#1027)
- Memory leak detection for long-running apps (#1030)
- Benchmarks for all remaining widgets (#1031)

#### Testing
- Integration tests for widget + system interactions (#982)
- End-to-end rendering pipeline tests (#985)
- Test helper utilities module for world/entity creation (#1105)
- Shared test fixtures and test data (#1068, #1116)
- 271 tests for 8 previously untested source files (#1052)
- Error handling tests for system boundaries (#1064)
- Error handling tests for terminal I/O boundaries (#1113)
- Snapshot testing for ANSI output rendering (#1120)
- Test coverage reporting and threshold enforcement in CI (#1021)

#### Documentation
- ECS newcomers guide
- System execution order and phases guide
- Coordinate system documentation
- Widgets vs components relationship guide
- Game API vs ECS API distinction guide
- API documentation for 9 missing entity factories
- API reference for core systems module (#1107)
- API reference for specialized systems (#1103)
- API documentation for tabSize, warning events, emitDescendants, and Zod schemas (#1121)
- Testing utilities documentation (#1127)
- Comprehensive how-to guides for common tasks (#1119)
- Comprehensive testing guide (#1102)
- Comprehensive error handling guide (#1098)
- Comprehensive 3D rendering guide (#1117)
- Performance optimization guide (#1115)
- Migration guide from blessed.js to blECSd (#1123)
- Export patterns clarification for blecsd vs specialized modules (#1125)
- One-page cheat sheet with common APIs (#957)
- TUI library comparison matrix (#980)
- Interactive examples for hello world, dashboard, forms, animation, and ECS game (#943)
- Library-first design examples with standalone components (#1112)
- Keyboard shortcuts reference guide (#1108)
- API reference pages for UserData and absolute positioning
- API reference for Switch and Toast widgets
- API documentation for word navigation and validation
- Code quality investigation findings (#1078)
- README updated to accurately reflect current library state

### Changed

#### Breaking: Functional Style Enforcement
- Eliminated `this` keyword from `src/core` and `src/components` (#1099)
- Eliminated `this` keyword from `src/systems` (#1101)
- Eliminated `this` keyword from `src/widgets` (#1104)
- Eliminated `this` keyword from `src/terminal` (#1110)
- Eliminated all remaining `this` keyword usage (#1114)

#### Refactoring
- Split `entities.ts` and `list.ts` god files into focused modules (#997)
- Split `ansi.ts` god file into 8 focused modules (#1124)
- Consolidated event system API for consistency (#989)
- Fixed parameter order in top 5 components (#1014)
- Enabled `exactOptionalPropertyTypes` in tsconfig.json (#1025)
- Used shared test fixtures in representative test files (#1068)
- LICENSE updated to Jeremy Stover (Kadajett) for 2026 (#923)
- Examples repository link added to README (#922)

#### Performance
- Unified dirty tracking: merged doubleBuffer and dirtyRects systems (#1000)
- Viewport bounds culling added to renderSystem (#1005)
- Per-phase frame time telemetry added to scheduler (#1006)
- Adaptive frame budget enforcement (#1007)
- Z-order occlusion culling to skip hidden widgets (#1126)
- Skip sorting in outputSystem for full redraws (#1097)
- Hot-path system audit and optimization (#1059)

### Fixed
- Removed direct bitecs `require()` in widget registry (#1091)
- Bundle size monitoring scripts corrected (#1043)

### Removed
- Unused `optimizedOutput` module (#1128)
- Circular import dependencies detected and fixed (#1061)

## [0.2.0] - 2026-02-06

### Added

#### PackedStore Performance Layer
- `PackedStore<T>` data structure using the three-vector pattern (data[], dataIndex[], id[], generations[]) for O(1) add/remove with cache-friendly dense iteration
- `createComponentStore<T>()` utility wrapping PackedStore with a Map-like API; supports iterable mode (PackedStore-backed, for hot paths) and non-iterable mode (Map-backed, for point lookups)
- System performance benchmark suite for measuring iteration throughput across storage strategies

#### PackedStore System Migrations
- `particleSystem`: emitter tracking migrated from Map to PackedStore for faster particle tick iteration (#914)
- `collisionSystem`: active collision/trigger pair storage migrated from Map to PackedStore with `ActivePairsView` read-only API (#912)
- `spatialHash`: incremental update dirty set backed by PackedStore; only re-hashes moved entities instead of full rebuild every frame (#915)
- `archetypePool`: entity recycling pool migrated to PackedStore for zero-allocation reuse (#917)

#### Widget Hot Path Migrations
- Tabs, Tree, and List widget `stateMap` stores migrated to iterable `ComponentStore` for faster per-frame iteration (#913)

#### World Adapter
- `worldAdapter` extended with `PackedQueryAdapter` for PackedStore-backed query result caching (#919)

#### Publishing & Build
- Sub-path exports: `blecsd/core`, `blecsd/debug`, `blecsd/errors`, `blecsd/input`
- `typesVersions` fallback for older TypeScript versions
- `getCachedFont()` for synchronous access to previously loaded fonts
- `build:publish` script with minification and no sourcemaps
- Size monitoring with `size-limit`
- Tree-shake verification script (`scripts/check-treeshake.ts`)
- CI publish workflow (`.github/workflows/publish.yml`)
- Pack verification script (`scripts/verify-pack.sh`)
- Sub-module barrels now re-export deep modules (smoothScroll, visibilityCulling, bracketedPaste, clipboardManager, throttledResize, memoryProfiler, overlay, streamingText, viewport3d, widthHarness, lazyInit, archetypePool)
- PackedStore documentation and performance notes added to README

### Changed
- Font loading is now async via dynamic imports, saving ~3.2 MB from the main bundle
- `createBigText()` returns `Promise<BigTextWidget>` (was synchronous)
- `loadFont()` from `blecsd/widgets/fonts` returns `Promise<BitmapFont>` (was synchronous)
- Root barrel simplified from 2,079 lines to ~60 lines using `export *` with disambiguations
- Examples moved to [blECSd-Examples](https://github.com/Kadajett/blECSd-Examples) repository
- `prepublishOnly` now uses `build:publish` (minified, no sourcemaps)
- CLI init tool now fetches templates from `blECSd-Examples` repository

### Fixed
- `addToStore` in `packedStore.ts` now reads the current generation counter instead of hardcoding `gen: 0` for new-index allocations, preventing stale handles after `clearStore` preserved bumped generations
- `collisionSystem` `emitEndedEvents` looks up handles from `handleMap` instead of reconstructing from store internals
- `pairNumericKey` validates entity IDs are below the 2^26 bound at runtime
- `spatialHash` `incrementalSpatialUpdate` guards against entities missing Position/Collider components
- `spatialHash` `setSpatialHashGrid` clears prev position caches when swapping grids
- `spatialHash` `removeStaleEntities` simplified (Map deletion during iteration is well-defined in JS)
- `spatialHash` `createSpatialHashSystemState` clamps `dirtyThreshold` to 0.0-1.0

### Removed
- `examples/` directory (moved to external repo)
- `templates` from npm package files list
- Static font JSON imports (replaced with dynamic `import()`)

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

[0.4.0]: https://github.com/Kadajett/blECSd/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Kadajett/blECSd/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Kadajett/blECSd/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Kadajett/blECSd/releases/tag/v0.1.0

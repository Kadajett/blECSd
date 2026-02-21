# blECSd

[![CI](https://github.com/Kadajett/blECSd/actions/workflows/ci.yml/badge.svg)](https://github.com/Kadajett/blECSd/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/blecsd.svg)](https://www.npmjs.com/package/blecsd)

![dvdBounce](https://github.com/user-attachments/assets/ba80c94a-4fe6-45d8-acb0-f147f25529d2)

A high-performance terminal UI library built on TypeScript and bitECS.

blECSd provides a complete toolkit for building terminal applications: dashboards, file managers, system monitors, CLI tools, and games. It combines the performance of an Entity Component System with production-ready widgets and form controls.

## Features

- **43 Widgets**: Box, Panel, Tabs, List, Table, Tree, Terminal, Video, 3D Viewport, and more
- **Form Controls**: Textarea, Textbox, Checkbox, RadioButton, Switch, Select, ProgressBar, Form
- **41 Components**: Position, Renderable, Focusable, Interactive, Animation, Collision, Camera, and more
- **21 Systems**: Layout, Input, Render, Animation, Collision, SpatialHash, VisibilityCulling, and more
- **Physics-based Animations**: Velocity, acceleration, friction for smooth transitions
- **Virtualized Rendering**: Efficiently render 1000s of items
- **State Machines**: Built-in FSM support for complex UI state

## Install

```bash
npm install blecsd
```

## Quick Start

Create a terminal app with a bordered panel, text, and keyboard input:

```typescript
import { createWorld, createScreenEntity, createBoxEntity, createTextEntity } from 'blecsd/core';
import { createDirtyTracker } from 'blecsd/core';
import {
  layoutSystem, renderSystem, outputSystem, cleanup,
  setOutputStream, setOutputBuffer, setRenderBuffer,
} from 'blecsd/systems';
import { createProgram, createDoubleBuffer, getBackBuffer } from 'blecsd/terminal';

const cols = process.stdout.columns ?? 80;
const rows = process.stdout.rows ?? 24;

// 1. Initialize the terminal (alternate screen, hidden cursor, raw mode)
const program = createProgram();
await program.init();

// 2. Create the ECS world and screen entity
const world = createWorld();
createScreenEntity(world, { width: cols, height: rows });

// 3. Wire up the render pipeline buffers
setOutputStream(process.stdout);
const db = createDoubleBuffer(cols, rows);
setOutputBuffer(db);
setRenderBuffer(createDirtyTracker(cols, rows), getBackBuffer(db));

// 4. Build your UI
const panel = createBoxEntity(world, {
  x: 2, y: 1, width: 40, height: 12,
  border: { type: 1, top: true, bottom: true, left: true, right: true },
});

createTextEntity(world, {
  x: 4, y: 2, text: 'My Dashboard', parent: panel,
});

// 5. Render
function render(): void {
  layoutSystem(world);
  renderSystem(world);
  outputSystem(world);
}

render();

// 6. Handle keyboard input
program.on('key', (event) => {
  if (event.name === 'q' || (event.ctrl && event.name === 'c')) {
    cleanup(world);
    program.destroy();
    process.exit(0);
  }
  render();
});
```

## Namespace Imports

blECSd organizes its API into discoverable namespace objects. Instead of importing dozens of individual functions, import a namespace and explore it with autocomplete:

```typescript
import { position, scroll, content } from 'blecsd/components';
import { rope, colors, unicode } from 'blecsd/utils';
import { cursor, program, screen } from 'blecsd/terminal';

// Position operations
position.set(world, eid, 10, 5);
position.moveBy(world, eid, 1, 0);
position.zIndex.bringToFront(world, eid, siblings);

// Scroll control
scroll.by(world, eid, 0, 10);
scroll.toTop(world, eid);

// Text manipulation with rope data structure
const r = rope.create('Hello');
const modified = rope.insert(r, 5, ' World');
const text = rope.getText(modified);

// Color utilities
const hex = colors.rgbToHex(255, 100, 0);
const parsed = colors.parseColor('#ff6400');
```

### Import Tiers

| Tier | Import Path | Use Case |
|------|-------------|----------|
| **Tier 2 (Recommended)** | `'blecsd/core'`, `'blecsd/components'`, `'blecsd/systems'`, etc. | Full module access via subpaths |
| **Tier 1** | `'blecsd'` | Curated subset for small scripts |
| **Tier 3** | Deep imports | Internal only |

**Use subpath imports (Tier 2)** for all applications. They provide full API access, clear organization by domain, and reduced naming conflicts. The main `'blecsd'` entry re-exports a curated subset for convenience. See the [Export Patterns Guide](./docs/guides/export-patterns.md) for details.

## Addon Packages

Specialized functionality is available as separate packages:

| Package | Description | Install |
|---------|-------------|---------|
| [@blecsd/3d](./packages/3d/) | 3D rendering with braille, halfblock, sixel, kitty backends | `npm i @blecsd/3d` |
| [@blecsd/ai](./packages/ai/) | LLM UI widgets: conversation, streaming markdown, token tracking | `npm i @blecsd/ai` |
| [@blecsd/audio](./packages/audio/) | Audio channel management and sound triggers | `npm i @blecsd/audio` |
| [@blecsd/game](./packages/game/) | High-level `createGame()` API for terminal games | `npm i @blecsd/game` |
| [@blecsd/media](./packages/media/) | GIF/PNG parsing, ANSI rendering, image/video widgets | `npm i @blecsd/media` |

Each addon package also provides namespace objects for discoverability:

```typescript
// 3D math via namespaces
import { vec3, mat4, projection } from '@blecsd/3d';
const v = vec3.add(vec3.create(1, 0, 0), vec3.create(0, 1, 0));
const mvp = mat4.multiply(projection.perspective(60, 1.5, 0.1, 100), viewMatrix);

// AI widgets via namespaces
import { conversation, tokenTracker } from '@blecsd/ai';
conversation.addMessage(state, { role: 'user', content: 'Hello' });

// Media via namespaces
import { gif, png } from '@blecsd/media';
const frames = gif.parse.parseGIF(buffer);
```

Addon packages also support subpath imports for tree-shaking:

```typescript
import { vec3Add, vec3Cross } from '@blecsd/3d/math';
import { parseGIF } from '@blecsd/media/gif';
```

## Widgets

| Widget | Description |
|--------|-------------|
| BarChart | Bar chart visualization |
| BigText | Large ASCII art text |
| Box | Base container with borders, padding, content |
| Button | Clickable button with hover/focus states |
| Checkbox | Boolean toggle with customizable characters |
| FileManager | File browser with directory navigation |
| Form | Form field management, validation, submit |
| Gauge | Circular/radial gauge display |
| HoverText | Tooltip/hover text display |
| Image | Image rendering with various formats |
| Layout | Flex/grid layout container |
| Line | Horizontal/vertical separator |
| LineChart | Line chart visualization |
| List | Selectable list with keyboard/mouse support |
| Listbar | Horizontal navigation bar |
| ListTable | Table-style list display |
| Loading | Loading indicator with spinner |
| Log | Scrollable log viewer |
| Message | Message box with buttons |
| Modal | Modal dialog overlay |
| Panel | Box with title bar, collapsible, close button |
| ProgressBar | Progress indicator, horizontal/vertical |
| Prompt | Input prompt dialog |
| Question | Question dialog with yes/no buttons |
| RadioButton | Single selection from group |
| ScrollableBox | Container with scroll support |
| ScrollableText | Scrollable text area |
| Sparkline | Sparkline chart visualization |
| SplitPane | Split pane container with resize |
| StreamingText | Text display with typewriter effect |
| Switch | Toggle switch control |
| Table | Data table with headers, columns, sorting |
| Tabs | Tabbed container with keyboard navigation |
| Terminal | ANSI terminal emulator with PTY support |
| Text | Text display with alignment, wrapping |
| Textarea | Multi-line text editor |
| Textbox | Single-line text input |
| TextEditing | Text editing utilities |
| Toast | Toast notification popup |
| Tree | Hierarchical tree view with expand/collapse |
| Video | Video playback widget |
| Viewport3d | 3D scene renderer |
| VirtualizedList | Efficient list for large datasets |

## Components

blECSd provides ECS components that work with any bitECS world. Each component has a corresponding namespace object for typed access:

```typescript
import { position, content, list, scroll } from 'blecsd/components';

position.set(world, eid, 10, 5);       // set x, y
content.set(world, eid, 'Hello');       // set text content
list.select(world, eid, 2);            // select item at index
scroll.toBottom(world, eid);           // scroll to end
```

| Component | Namespace | Purpose |
|-----------|-----------|---------|
| Animation | `animation` | Frame-based sprite animations |
| Border | `border` | Box borders (single, double, rounded, bold, ascii) |
| Camera | `camera` | Viewport, target following, bounds |
| Collision | `collision` | AABB/circle collision detection, layers, triggers |
| Content | `content` | Text content, alignment, wrapping, tag parsing |
| Dimensions | `dimensions` | Width, height, min/max constraints, percentages |
| Focusable | `focus` | Keyboard focus, tab order |
| Hierarchy | `hierarchy` | Parent-child relationships, traversal |
| List | `list` | List widget state, selection, virtualization |
| Position | `position` | X/Y coordinates, z-index, absolute positioning |
| Renderable | `renderable` | Colors, visibility, dirty tracking |
| Scrollable | `scroll` | Scroll position, scrollbars, virtual viewport |
| Table | `table` | Table state, columns, rows, sorting |
| TextInput | `textInput` | Text input, cursor, selection, validation |
| Velocity | `velocity` | Movement with speed, friction, max speed |

See [API Reference](./docs/api/index.md) for the complete list of all 41 components.

## Systems

| System | Purpose |
|--------|---------|
| animationSystem | Update sprite animations |
| behaviorSystem | Execute behavior trees |
| cameraSystem | Update camera following target |
| collisionSystem | Detect and resolve collisions |
| dragSystem | Handle drag and drop |
| focusSystem | Manage focus, tab navigation |
| frameBudget | Frame time profiling and budget management |
| inputSystem | Process keyboard/mouse input |
| layoutSystem | Calculate positions, dimensions |
| movementSystem | Apply velocity to position |
| outputSystem | Write buffer to terminal |
| panelMovement | Handle panel drag/resize |
| particleSystem | Update particle effects |
| renderSystem | Render entities to screen buffer |
| smoothScroll | Smooth scrolling animations |
| spatialHash | Spatial partitioning for collision |
| stateMachineSystem | Process state machine transitions |
| tilemapRenderer | Render tilemap layers |
| virtualizedRenderSystem | Efficient rendering for large datasets |
| visibilityCulling | Frustum/viewport culling |
| workerPool | Background task processing |

## Library Design

blECSd is a library, not a framework:

1. **Components work standalone**: Import them into any bitECS world
2. **No required update loop**: All systems are callable functions
3. **Mix and match**: Use our input parsing with your rendering, or vice versa
4. **You own the world**: Functions take `world` as a parameter; we never hold global state

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createDirtyTracker } from 'blecsd/core';
import { layoutSystem, renderSystem, outputSystem, setOutputStream, setOutputBuffer, setRenderBuffer } from 'blecsd/systems';
import { createDoubleBuffer, getBackBuffer } from 'blecsd/terminal';
import { position, renderable } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);

// Use namespace helpers for typed access
position.set(world, eid, 10, 5);
renderable.show(world, eid);

// Initialize buffers (required for render/output systems)
setOutputStream(process.stdout);
const db = createDoubleBuffer(80, 24);
setOutputBuffer(db);
setRenderBuffer(createDirtyTracker(80, 24), getBackBuffer(db));

// Call systems when you want
layoutSystem(world);
renderSystem(world);
outputSystem(world);
```

## Use Cases

- **Dashboards**: System monitors, log viewers, status displays
- **File Managers**: Tree views, virtualized lists, panels
- **CLI Tools**: Forms, menus, progress indicators
- **Dev Tools**: Debug panels, profilers, inspectors
- **Games**: Roguelikes, text adventures, puzzle games
- **AI Interfaces**: LLM chat, streaming output, token tracking (via @blecsd/ai)
- **3D Terminals**: Wireframe viewers, model inspectors (via @blecsd/3d)

## Comparison

| Feature | blECSd | Ink | blessed | Textual |
|---------|--------|-----|---------|---------|
| Architecture | ECS + PackedStore (data-oriented) | React (component) | Class-based | Widget classes |
| Language | TypeScript | TypeScript/JSX | JavaScript | Python |
| Widgets | 43 built-in | Few built-in | Many built-in | Many built-in |
| Animation | Physics-based | Manual | Manual | CSS-like |
| Virtualization | Built-in | Manual | Manual | Built-in |
| Game support | First-class | Limited | Limited | Limited |

Choose blECSd if you want data-oriented design, physics-based animations, or game development support. Choose Ink for React-style development. Choose Textual for Python projects.

## Documentation

### Getting Started
- [Installation](./docs/getting-started/installation.md): Requirements, terminal compatibility, setup
- [Core Concepts](./docs/getting-started/concepts.md): ECS, scheduler, events
- [Hello World](./docs/getting-started/hello-world.md): Your first blECSd application

### API Reference
- [API Reference](./docs/api/index.md): Components, widgets, systems, terminal I/O
- [Export Patterns](./docs/guides/export-patterns.md): Import tiers, namespaces, module map
- [Terminal Widget](./docs/api/widgets/terminal.md): ANSI rendering and PTY shell support

### Guides
- [Guides](./docs/guides/): Animations, forms, layouts, and more
- [Error Handling](./docs/guides/error-handling.md): Error boundaries and recovery
- [Testing Guide](./docs/guides/testing.md): Unit and integration testing
- [Performance Optimization](./docs/guides/performance.md): Profiling and optimization
- [Migration Guide](./docs/guides/migration.md): Migrating from other libraries
- [Keyboard Shortcuts](./docs/guides/keyboard-shortcuts.md): Custom keybindings

### Examples
- [Examples Repository](https://github.com/Kadajett/blECSd-Examples): File manager, multiplexer, system monitor, ANSI viewer, telnet server, and more

## Development

```bash
pnpm install
pnpm test
pnpm lint
pnpm build
```

### Benchmarking

Run performance benchmarks to measure system performance:

```bash
# Run all benchmarks
pnpm bench

# Run CI benchmarks (fast subset for regression detection)
pnpm bench:ci

# Run real-world scenario benchmarks
pnpm bench:scenarios

# Update performance baseline
pnpm bench:update-baseline

# Check for performance regressions (vs baseline)
pnpm bench:check-regression
```

The CI automatically checks for performance regressions on pull requests. If any benchmark regresses by more than 20%, the build will fail.

## License

MIT

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

```typescript
import {
  createWorld,
  addEntity,
  Position,
  Dimensions,
  Border,
  createBox,
  createList,
  createEventBus
} from 'blecsd';

// Create a world and entity
const world = createWorld();
const entity = addEntity(world);

// Set position and dimensions using components
Position.x[entity] = 2;
Position.y[entity] = 1;
Dimensions.width[entity] = 40;
Dimensions.height[entity] = 10;

// Create a box widget
const box = createBox(world, entity, {
  border: { type: 'rounded' },
  title: 'My Application'
});

// Create a list in another entity
const listEntity = addEntity(world);
const list = createList(world, listEntity, {
  items: [
    { label: 'Option 1', value: 'opt1' },
    { label: 'Option 2', value: 'opt2' },
    { label: 'Option 3', value: 'opt3' }
  ]
});

// Type-safe events
interface AppEvents {
  'item:selected': { value: string };
}
const events = createEventBus<AppEvents>();
events.on('item:selected', (e) => console.log(`Selected: ${e.value}`));
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

## Form Controls

| Control | Description |
|---------|-------------|
| Textarea | Multi-line text editor with cursor, selection |
| Textbox | Single-line text input with cursor support |
| Checkbox | Boolean toggle with customizable characters |
| RadioButton | Single selection from group |
| Switch | Toggle switch control |
| Select | Dropdown selection menu (via List component) |
| ProgressBar | Progress indicator, horizontal/vertical |
| Form | Form field management, validation, submit |
| Button | Clickable button with hover/focus states |

## Components

blECSd provides ECS components that work with any bitECS world:

| Component | Purpose |
|-----------|---------|
| Animation | Frame-based sprite animations |
| Behavior | Behavior tree execution |
| Border | Box borders (single, double, rounded, bold, ascii) |
| Button | Button state and configuration |
| Camera | Viewport, target following, bounds |
| Checkbox | Checkbox state |
| Collision | AABB/circle collision detection, layers, triggers |
| Content | Text content, alignment, wrapping, tag parsing |
| Dimensions | Width, height, min/max constraints, percentages |
| Focusable | Keyboard focus, tab order |
| Form | Form field management |
| Health | Health/damage system |
| Hierarchy | Parent-child relationships, traversal |
| Input | Input capture state |
| Interactive | Click, hover, drag states |
| Label | Text labels with positioning |
| List | List widget state |
| Padding | Inner spacing |
| Particle | Particle system data |
| Position | X/Y coordinates, z-index, absolute positioning |
| ProgressBar | Progress bar state |
| RadioButton | Radio button state |
| Renderable | Colors, visibility, dirty tracking |
| Screen | Screen buffer data |
| Scrollable | Scroll position, content size, scrollbars |
| Scrollbar | Scrollbar state |
| Select | Selection dropdown state |
| Shadow | Drop shadows with opacity, blending |
| Slider | Slider state |
| Spinner | Loading spinner state |
| Sprite | Sprite sheets, frames |
| StateMachine | Finite state machine with events, transitions |
| Table | Table widget state |
| TerminalBuffer | Terminal emulator buffer |
| TextInput | Text input state |
| TextSelection | Text selection state |
| Tilemap | Tilemap rendering data |
| Timer | Timer/countdown state |
| UserData | Custom user data storage |
| Velocity | Movement with speed, friction, max speed |
| VirtualViewport | Virtualized content rendering |

See [API Reference](./docs/api/index.md) for the complete list.

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
// Your world, your control
import {
  createWorld,
  addEntity,
  Position,
  Renderable,
  layoutSystem,
  renderSystem
} from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Use components directly - no setters needed
Position.x[eid] = 10;
Position.y[eid] = 5;
Renderable.visible[eid] = 1;

// Call systems when you want
layoutSystem(world);
renderSystem(world);
```

## PackedStore: Cache-Friendly Storage

blECSd includes a `PackedStore<T>` primitive for systems that iterate over entities in hot paths (rendering, animation, collision). It provides O(1) add/remove/get with dense, cache-friendly iteration.

### The Three-Vector Pattern

PackedStore uses four parallel arrays to keep live data contiguous:

```
data[]        Dense values, packed into [0, size) with no gaps
dataIndex[]   Maps handle.index -> position in data[]
id[]          Maps data position -> handle.index (inverse of dataIndex)
generations[] Generation counter per slot for stale handle detection
```

Removals use swap-and-pop: the last element fills the gap, so `data[]` is always contiguous. This means iterating `data[0..size]` hits sequential memory with no pointer chasing, which is 2-5x faster than `Map.forEach` for iteration-heavy workloads.

### createComponentStore\<T\>()

For most code, use `createComponentStore<T>()` instead of PackedStore directly. It provides a Map-like API (`get`, `set`, `has`, `delete`, `forEach`) with two backing modes:

```typescript
import { createComponentStore } from 'blecsd';

// Iterable mode: backed by PackedStore, dense iteration via forEach/data()
// Use for stores iterated in hot paths (widget rendering, layout, animation)
const renderData = createComponentStore<RenderInfo>({ iterable: true });

// Non-iterable mode (default): backed by a plain Map
// Use for point lookups like callback registries or config
const callbacks = createComponentStore<() => void>({ iterable: false });
```

| Mode | Backing | Iteration | Best for |
|------|---------|-----------|----------|
| `iterable: true` | PackedStore | Dense, cache-friendly | Hot paths (render, animate, layout) |
| `iterable: false` | Map | Standard Map iteration | Callbacks, config, point lookups |

## Use Cases

- **Dashboards**: System monitors, log viewers, status displays
- **File Managers**: Tree views, virtualized lists, panels
- **CLI Tools**: Forms, menus, progress indicators
- **Dev Tools**: Debug panels, profilers, inspectors
- **Games**: Roguelikes, text adventures, puzzle games

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
- [Terminal Widget](./docs/api/widgets/terminal.md): ANSI rendering and PTY shell support

### Guides
- [Guides](./docs/guides/): Animations, forms, layouts, and more
- [Error Handling](./docs/guides/error-handling.md): Error boundaries and recovery
- [Testing Guide](./docs/guides/testing.md): Unit and integration testing
- [Performance Optimization](./docs/guides/performance.md): Profiling and optimization
- [Migration Guide](./docs/guides/migration.md): Migrating from other libraries
- [Keyboard Shortcuts](./docs/guides/keyboard-shortcuts.md): Custom keybindings

### Examples
- [Examples](./docs/examples/index.md): File manager, multiplexer, system monitor, ANSI viewer, telnet server
- [Examples Repository](https://github.com/Kadajett/blECSd-Examples): Standalone runnable examples

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

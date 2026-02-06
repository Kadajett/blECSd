# blECSd

[![CI](https://github.com/Kadajett/blECSd/actions/workflows/ci.yml/badge.svg)](https://github.com/Kadajett/blECSd/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/blecsd.svg)](https://www.npmjs.com/package/blecsd)

![dvdBounce](https://github.com/user-attachments/assets/ba80c94a-4fe6-45d8-acb0-f147f25529d2)

A high-performance terminal UI library built on TypeScript and bitECS.

blECSd provides a complete toolkit for building terminal applications: dashboards, file managers, system monitors, CLI tools, and games. It combines the performance of an Entity Component System with production-ready widgets and form controls.

## Features

- **18 Widgets**: Box, Panel, Tabs, List, Table, Tree, VirtualizedList, and more
- **Form Controls**: TextInput, Checkbox, RadioButton, Slider, Select, ProgressBar
- **32 Components**: Position, Renderable, Focusable, Interactive, Animation, Collision, etc.
- **12 Systems**: Layout, Input, Render, Animation, Collision, Camera, Drag, Focus, etc.
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
  setPosition,
  setDimensions,
  setBorder,
  setContent,
  createPanel,
  createList,
  createTextInput,
  createEventBus
} from 'blecsd';

// Create a world and entities
const world = createWorld();

// Create a panel with a title
const panel = createPanel(world, {
  x: 2,
  y: 1,
  width: 40,
  height: 10,
  title: 'My Application',
  border: { type: 'rounded' }
});

// Create an interactive list
const list = createList(world, {
  x: 4,
  y: 3,
  width: 36,
  height: 6,
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
| Box | Base container with borders, padding, content |
| Panel | Box with title bar, collapsible, close button |
| Tabs | Tabbed container with keyboard navigation |
| Text | Text display with alignment, wrapping |
| List | Selectable list with keyboard/mouse support |
| Table | Data table with headers, columns, sorting |
| Tree | Hierarchical tree view with expand/collapse |
| VirtualizedList | Efficient list for large datasets |
| ListTable | Table-style list display |
| Listbar | Horizontal navigation bar |
| Line | Horizontal/vertical separator |
| Loading | Loading indicator with spinner |
| ScrollableBox | Container with scroll support |
| ScrollableText | Scrollable text area |
| HoverText | Tooltip/hover text display |
| Layout | Flex/grid layout container |

## Form Controls

| Control | Description |
|---------|-------------|
| TextInput | Single/multi-line text entry with cursor, selection |
| Checkbox | Boolean toggle with customizable characters |
| RadioButton | Single selection from group |
| Slider | Range value selection, horizontal/vertical |
| Select | Dropdown selection menu |
| ProgressBar | Progress indicator, horizontal/vertical |
| Form | Form field management, validation, submit |

## Components

blECSd provides ECS components that work with any bitECS world:

| Component | Purpose |
|-----------|---------|
| Position | X/Y coordinates, z-index, absolute positioning |
| Renderable | Colors, visibility, dirty tracking |
| Dimensions | Width, height, min/max constraints, percentages |
| Hierarchy | Parent-child relationships, traversal |
| Focusable | Keyboard focus, tab order |
| Interactive | Click, hover, drag states |
| Scrollable | Scroll position, content size, scrollbars |
| Border | Box borders (single, double, rounded, bold, ascii) |
| Content | Text content, alignment, wrapping, tag parsing |
| Padding | Inner spacing |
| Label | Text labels with positioning |
| Animation | Frame-based sprite animations |
| Velocity | Movement with speed, friction, max speed |
| Collision | AABB/circle collision detection, layers, triggers |
| Camera | Viewport, target following, bounds |
| StateMachine | Finite state machine with events, transitions |
| Sprite | Sprite sheets, frames |
| Shadow | Drop shadows with opacity, blending |
| VirtualViewport | Virtualized content rendering |

See [API Reference](./docs/api/index.md) for the complete list.

## Systems

| System | Purpose |
|--------|---------|
| inputSystem | Process keyboard/mouse input |
| focusSystem | Manage focus, tab navigation |
| layoutSystem | Calculate positions, dimensions |
| renderSystem | Render entities to screen buffer |
| virtualizedRenderSystem | Efficient rendering for large datasets |
| animationSystem | Update sprite animations |
| movementSystem | Apply velocity to position |
| collisionSystem | Detect and resolve collisions |
| cameraSystem | Update camera following target |
| dragSystem | Handle drag and drop |
| stateMachineSystem | Process state machine transitions |
| outputSystem | Write buffer to terminal |

## Library Design

blECSd is a library, not a framework:

1. **Components work standalone**: Import them into any bitECS world
2. **No required update loop**: All systems are callable functions
3. **Mix and match**: Use our input parsing with your rendering, or vice versa
4. **You own the world**: Functions take `world` as a parameter; we never hold global state

```typescript
// Your world, your control
import { createWorld, addEntity, setPosition, setRenderable, layoutSystem, renderSystem } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Use components without our update loop
setPosition(world, eid, 10, 5);

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
| Widgets | 18 built-in | Few built-in | Many built-in | Many built-in |
| Animation | Physics-based | Manual | Manual | CSS-like |
| Virtualization | Built-in | Manual | Manual | Built-in |
| Game support | First-class | Limited | Limited | Limited |

Choose blECSd if you want data-oriented design, physics-based animations, or game development support. Choose Ink for React-style development. Choose Textual for Python projects.

## Documentation

- [Installation](./docs/getting-started/installation.md): Requirements, terminal compatibility, setup
- [Core Concepts](./docs/getting-started/concepts.md): ECS, scheduler, events
- [Hello World](./docs/getting-started/hello-world.md): Your first blECSd application
- [API Reference](./docs/api/index.md): Components, widgets, systems, terminal I/O
- [Terminal Widget](./docs/api/widgets/terminal.md): ANSI rendering and PTY shell support
- [Examples](./docs/examples/index.md): File manager, multiplexer, system monitor, ANSI viewer, telnet server
- [Guides](./docs/guides/): Animations, forms, layouts, and more

## Development

```bash
pnpm install
pnpm test
pnpm lint
pnpm build
```

## License

MIT

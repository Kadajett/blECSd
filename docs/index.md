# blECSd Documentation

A high-performance terminal UI library built on TypeScript and bitECS.

## What blECSd Provides

- **ECS Components** for UI elements (position, rendering, hierarchy, focus, interaction)
- **Input Parsing** for keyboard and mouse events
- **Type-safe Events** with generic EventBus
- **State Machines** attachable to entities
- **Entity Factories** for common UI elements
- **Animation System** for physics-based transitions, momentum scrolling, and spring dynamics
- **Optional Scheduler** with fixed phase ordering

## What blECSd Does Not Do

blECSd is a library, not a framework. It does not:

- Own or manage your update loop
- Force a specific architecture
- Provide a high-level widget API (yet)
- Handle rendering to the terminal (bring your own renderer)

You control the world. blECSd provides components and utilities.

## Use Cases

blECSd is designed for:

- **TUI Applications** - Dashboards, file managers, dev tools, CLI interfaces
- **Terminal Games** - Roguelikes, text adventures, ASCII games
- **Interactive Visualizations** - Data displays, monitoring tools
- **Anything requiring high-performance terminal rendering**

## Getting Started

1. [Installation](./getting-started/installation.md) - Install and verify
2. [Concepts](./getting-started/concepts.md) - Understand the architecture
3. [Hello World](./getting-started/hello-world.md) - Your first blECSd application

## Tutorials

Step-by-step guides for building applications:

- [Todo List](./tutorials/todo-list.md) - Forms, state management, keyboard navigation (beginner)
- [File Browser](./tutorials/file-browser.md) - Virtualized lists, file system operations (intermediate)
- [System Dashboard](./tutorials/dashboard.md) - Layouts, progress bars, auto-refresh (intermediate)
- [Simple Game](./tutorials/simple-game.md) - Animation, collision, state machines (advanced)

## Examples

Working applications demonstrating blECSd patterns:

- [Examples Gallery](./examples/index.md) - Overview of all examples
- [File Manager](./examples/file-manager.md) - Full-featured file manager with tabs, preview, virtualization

## Guides

- [Physics-Based Animations](./guides/animations.md) - Momentum, springs, and smooth transitions
- [Game Development](./guides/game-development.md) - Building terminal games with blECSd
- [FAQ & Troubleshooting](./faq.md) - Common questions and solutions

## API Reference

### Components

- [Position](./api/position.md) - Coordinates and z-index
- [Renderable](./api/renderable.md) - Colors and visibility
- [Dimensions](./api/dimensions.md) - Size and constraints
- [Hierarchy](./api/hierarchy.md) - Parent-child trees
- [Focusable](./api/focusable.md) - Keyboard focus
- [Interactive](./api/interactive.md) - Mouse interaction
- [Scrollable](./api/scrollable.md) - Scroll position
- [Border](./api/border.md) - Box borders
- [Content](./api/content.md) - Text content
- [Padding](./api/padding.md) - Inner spacing
- [Label](./api/label.md) - Text labels

### Core

- [Events](./api/events.md) - EventBus system
- [Entities](./api/entities.md) - Entity factories
- [Queries](./api/queries.md) - Entity queries

### Terminal I/O

- [ANSI](./api/ansi.md) - Escape sequences
- [Program](./api/program.md) - Terminal control
- [Detection](./api/detection.md) - Terminal capabilities
- [Security](./api/security.md) - Input sanitization

## Import Patterns

### Components and Core

```typescript
import {
  // Components
  setPosition,
  setStyle,
  setDimensions,

  // Entity factories
  createBoxEntity,
  createTextEntity,

  // Events
  createEventBus,

  // Scheduler
  createScheduler,
  LoopPhase,

  // Input parsing
  parseKeyBuffer,
  parseMouseSequence,
} from 'blecsd';
```

### Terminal I/O (Advanced)

```typescript
import {
  cursor,
  style,
  screen,
  mouse,
} from 'blecsd/terminal';
```

# blECSd

A modern terminal game library built on TypeScript and ECS architecture.

blECSd is a ground-up rewrite of the [blessed](https://github.com/chjj/blessed) library, reimagined for game development with an Entity Component System (ECS) foundation.

## Features

- **ECS Architecture** - Built on [bitecs](https://github.com/NateTheGreatt/bitECS) for high-performance game state management
- **TypeScript First** - Strict types throughout with full IntelliSense support
- **Library, Not Framework** - Use components standalone or with your own game loop
- **Terminal I/O** - Complete keyboard and mouse input parsing, ANSI sequence generation
- **Typed Events** - Generic EventBus with full type inference
- **State Machines** - Built-in FSM component for game entity states
- **Zod Validation** - Runtime validation at system boundaries

## Installation

```bash
npm install blecsd
# or
pnpm add blecsd
```

## Quick Start

```typescript
import { createWorld, addEntity } from 'bitecs';
import {
  setPosition,
  setRenderable,
  createEventBus,
  createScheduler,
  LoopPhase
} from 'blecsd';

// Create your world
const world = createWorld();

// Create an entity
const player = addEntity(world);
setPosition(world, player, 10, 5);
setRenderable(world, player, { char: '@', fg: 0x00ff00 });

// Create event bus for game events
interface GameEvents {
  'player:move': { x: number; y: number };
  'game:over': { score: number };
}
const events = createEventBus<GameEvents>();

// Subscribe to events
events.on('player:move', ({ x, y }) => {
  console.log(`Player moved to ${x}, ${y}`);
});

// Create scheduler for game loop
const scheduler = createScheduler();
scheduler.add(LoopPhase.UPDATE, (world, delta) => {
  // Your update logic
  return world;
});

// Run game loop
scheduler.start(world);
```

## Core Concepts

### Components

blECSd provides ready-to-use ECS components:

| Component | Purpose |
|-----------|---------|
| `Position` | 2D coordinates and z-index |
| `Renderable` | Visual appearance (char, colors, visibility) |
| `Dimensions` | Width, height, constraints |
| `Hierarchy` | Parent-child relationships |
| `Focusable` | Keyboard focus management |
| `Interactive` | Mouse interaction (hover, click, drag) |
| `Scrollable` | Scrolling content regions |
| `Border` | Box borders with multiple styles |
| `Content` | Text content with alignment |
| `Padding` | Inner spacing |
| `Label` | Text labels for elements |

### Systems

Systems are pure functions that process entities:

```typescript
import { defineQuery, hasComponent } from 'bitecs';
import { Position, Velocity } from 'blecsd';

const movementQuery = defineQuery([Position, Velocity]);

function movementSystem(world: World): World {
  for (const eid of movementQuery(world)) {
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];
  }
  return world;
}
```

### Event Bus

Type-safe event handling:

```typescript
import { createEventBus, type UIEventMap } from 'blecsd';

// Use built-in UI events
const uiEvents = createEventBus<UIEventMap>();
uiEvents.on('focus', ({ entity }) => { /* ... */ });
uiEvents.on('click', ({ entity, x, y }) => { /* ... */ });

// Or define your own
interface MyEvents {
  'enemy:spawn': { type: string; x: number; y: number };
  'level:complete': { level: number; time: number };
}
const gameEvents = createEventBus<MyEvents>();
```

### State Machines

Attach state machines to entities:

```typescript
import { createStateMachine, attachStateMachine, sendEvent } from 'blecsd';

const enemyFSM = createStateMachine({
  initial: 'idle',
  states: {
    idle: { on: { ALERT: 'chasing' } },
    chasing: { on: { LOST: 'searching', CAUGHT: 'attacking' } },
    searching: { on: { FOUND: 'chasing', TIMEOUT: 'idle' } },
    attacking: { on: { DEFEATED: 'idle' } }
  }
});

attachStateMachine(world, enemyEntity, enemyFSM);
sendEvent(world, enemyEntity, 'ALERT'); // Transitions to 'chasing'
```

### Input Parsing

Parse terminal input sequences:

```typescript
import { parseKeyBuffer, parseMouseSequence } from 'blecsd';

// Parse keyboard input
const keyEvent = parseKeyBuffer(buffer);
if (keyEvent) {
  console.log(keyEvent.name, keyEvent.ctrl, keyEvent.shift);
}

// Parse mouse input
const mouseEvent = parseMouseSequence(sequence);
if (mouseEvent) {
  console.log(mouseEvent.action, mouseEvent.x, mouseEvent.y);
}
```

## Documentation

Full API documentation is available in the `docs/` directory:

- [Getting Started](./docs/getting-started/installation.md)
- [Core Concepts](./docs/getting-started/concepts.md)
- [API Reference](./docs/api/index.md)

### API Reference

**Components:**
- [Position](./docs/api/position.md) - Coordinates and z-index
- [Renderable](./docs/api/renderable.md) - Visual appearance
- [Dimensions](./docs/api/dimensions.md) - Size and constraints
- [Hierarchy](./docs/api/hierarchy.md) - Parent-child trees
- [Focusable](./docs/api/focusable.md) - Focus management
- [Interactive](./docs/api/interactive.md) - Mouse interaction
- [Scrollable](./docs/api/scrollable.md) - Scrolling regions
- [Border](./docs/api/border.md) - Box borders
- [Content](./docs/api/content.md) - Text content
- [Padding](./docs/api/padding.md) - Inner spacing
- [Label](./docs/api/label.md) - Text labels

**Core:**
- [Events](./docs/api/events.md) - EventBus system
- [Entities](./docs/api/entities.md) - Entity factories
- [Queries](./docs/api/queries.md) - Entity queries

**Terminal:**
- [ANSI](./docs/api/ansi.md) - Escape sequences
- [Program](./docs/api/program.md) - Terminal control
- [Security](./docs/api/security.md) - Input sanitization

## Architecture

blECSd follows a library-first design:

```
src/
├── components/     # ECS components (Position, Renderable, etc.)
├── core/           # World, scheduler, events, entities, queries
├── schemas/        # Zod validation schemas
└── terminal/       # Terminal I/O (input parsing, ANSI, etc.)
```

**Key principles:**

1. **Use components standalone** - Import into your own bitecs world
2. **Skip the built-in loop** - All systems are callable functions
3. **Mix and match** - Use our input parsing with your rendering
4. **You control the world** - Functions take `world` as a parameter

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Lint
pnpm lint

# Build
pnpm build
```

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Credits

Inspired by the original [blessed](https://github.com/chjj/blessed) library by Christopher Jeffrey.

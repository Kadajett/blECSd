# blECSd

A terminal game library built on TypeScript and bitECS.

blECSd provides ECS components, input parsing, and terminal I/O for building terminal-based games. It is a library, not a framework: you control the game loop, the world, and how components are used.

## Install

```bash
npm install blecsd
```

## Quick Example

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setPosition, setStyle, createEventBus } from 'blecsd';

// Your world, your control
const world = createWorld();
const player = addEntity(world);

// Add components
setPosition(world, player, 10, 5);
setStyle(world, player, { fg: '#00ff00', bold: true });

// Type-safe events
interface GameEvents {
  'player:move': { x: number; y: number };
}
const events = createEventBus<GameEvents>();
events.on('player:move', (e) => console.log(`Moved to ${e.x}, ${e.y}`));
```

## Components

blECSd provides ECS components that work with any bitECS world:

| Component | Purpose |
|-----------|---------|
| Position | X/Y coordinates and z-index |
| Renderable | Colors, visibility, text styles |
| Dimensions | Width, height, min/max constraints |
| Hierarchy | Parent-child relationships |
| Focusable | Keyboard focus and tab order |
| Interactive | Click, hover, drag states |
| Scrollable | Scroll position and content size |
| Border | Box borders with multiple styles |
| Content | Text content with alignment |
| Padding | Inner spacing |
| Label | Text labels for elements |

Each component has getter/setter functions:

```typescript
import { setPosition, getPosition, setStyle, isVisible } from 'blecsd';

setPosition(world, entity, 10, 5);
const pos = getPosition(world, entity); // { x: 10, y: 5, z: 0, absolute: false }

setStyle(world, entity, { fg: '#ff0000', bold: true });
isVisible(world, entity); // true
```

## Entity Factories

Create pre-configured entities:

```typescript
import { createWorld, createBoxEntity, createTextEntity, BorderType } from 'blecsd';

const world = createWorld();

const box = createBoxEntity(world, {
  x: 0,
  y: 0,
  width: 40,
  height: 10,
  border: { type: BorderType.Line },
});

const text = createTextEntity(world, {
  x: 5,
  y: 2,
  text: 'Hello',
  fg: 0xffffffff,
});
```

## Event Bus

Type-safe event handling:

```typescript
import { createEventBus } from 'blecsd';

interface GameEvents {
  'enemy:spawn': { type: string; x: number; y: number };
  'game:over': { score: number };
}

const events = createEventBus<GameEvents>();

const unsubscribe = events.on('enemy:spawn', (e) => {
  console.log(`${e.type} spawned at ${e.x}, ${e.y}`);
});

events.emit('enemy:spawn', { type: 'goblin', x: 10, y: 5 });

unsubscribe(); // Stop listening
```

## Scheduler

Optional game loop with fixed phase ordering:

```typescript
import { createWorld, createScheduler, LoopPhase } from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

scheduler.add(LoopPhase.UPDATE, (world, delta) => {
  // Game logic runs here
  return world;
});

scheduler.add(LoopPhase.RENDER, (world, delta) => {
  // Rendering runs here
  return world;
});

scheduler.start(world);
```

Phase order:
1. INPUT (reserved, always first)
2. EARLY_UPDATE
3. UPDATE
4. LATE_UPDATE
5. PHYSICS
6. LAYOUT
7. RENDER
8. POST_RENDER

## Input Parsing

Parse terminal input sequences:

```typescript
import { parseKeyBuffer, parseMouseSequence } from 'blecsd';

// Keyboard
const key = parseKeyBuffer(buffer);
if (key) {
  console.log(key.name, key.ctrl, key.shift);
}

// Mouse (SGR format)
const mouse = parseMouseSequence(sequence);
if (mouse) {
  console.log(mouse.action, mouse.x, mouse.y);
}
```

## State Machines

Attach FSMs to entities:

```typescript
import { attachStateMachine, sendEvent, getState } from 'blecsd';

const definition = {
  initial: 'idle',
  states: {
    idle: { on: { ALERT: 'chase' } },
    chase: { on: { LOST: 'search', CAUGHT: 'attack' } },
    search: { on: { FOUND: 'chase', TIMEOUT: 'idle' } },
    attack: { on: { DONE: 'idle' } },
  },
};

attachStateMachine(world, enemy, definition);
sendEvent(world, enemy, 'ALERT');
getState(world, enemy); // 'chase'
```

## Documentation

- [Getting Started](./docs/getting-started/installation.md)
- [Core Concepts](./docs/getting-started/concepts.md)
- [API Reference](./docs/api/index.md)

## Library Design

blECSd is a library, not a framework. This means:

1. **Components work standalone** - Import them into any bitECS world
2. **No required game loop** - All systems are callable functions
3. **Mix and match** - Use our input parsing with your rendering, or vice versa
4. **You own the world** - Functions take `world` as a parameter; we never hold global state

## Development

```bash
pnpm install
pnpm test
pnpm lint
pnpm build
```

## License

MIT

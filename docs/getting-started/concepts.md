# Core Concepts

## Library, Not Framework

blECSd does not own your game loop or world. You can:

1. Use components in your own bitECS world
2. Skip the scheduler entirely
3. Use only the parts you need
4. Integrate with existing systems

```typescript
// Your own game loop
function gameLoop() {
  processInput();
  updateGame(world);
  render(world);
  requestAnimationFrame(gameLoop);
}

// blECSd components still work
import { setPosition, getPosition } from 'blecsd';
setPosition(world, player, x, y);
```

## Entity Component System

blECSd uses [bitECS](https://github.com/NateTheGreatt/bitECS) for its ECS implementation. The pattern separates data (components) from behavior (systems).

### Entities

An entity is an integer ID with no data or behavior.

```typescript
import { createWorld, addEntity } from 'bitecs';

const world = createWorld();
const player = addEntity(world);   // Returns an integer like 1
const enemy = addEntity(world);    // Returns 2
```

### Components

Components are typed data stores. blECSd provides components for common game needs:

```typescript
import { Position, Renderable, Dimensions } from 'blecsd';

// Components use Structure of Arrays (SoA) for performance
Position.x[player] = 10;
Position.y[player] = 5;
Renderable.fg[player] = 0xffffffff;  // White foreground
```

blECSd wraps raw component access with helper functions:

```typescript
import { setPosition, setStyle, getPosition } from 'blecsd';

setPosition(world, player, 10, 5);
setStyle(world, player, { fg: '#ffffff', bold: true });

const pos = getPosition(world, player);
// { x: 10, y: 5, z: 0, absolute: false }
```

### Systems

Systems are functions that process entities with specific components:

```typescript
import { defineQuery } from 'bitecs';
import { Position, Renderable, queryRenderable } from 'blecsd';

// Query for entities with both Position and Renderable
const renderQuery = defineQuery([Position, Renderable]);

function renderSystem(world) {
  const entities = renderQuery(world);
  for (const eid of entities) {
    const x = Position.x[eid];
    const y = Position.y[eid];
    // Draw entity at x, y
  }
  return world;
}
```

blECSd provides pre-built queries:

```typescript
import { queryRenderable, filterVisible, sortByZIndex } from 'blecsd';

const visibleEntities = filterVisible(world, queryRenderable(world));
const sorted = sortByZIndex(world, visibleEntities);
```

## Optional Scheduler

The scheduler provides phase-ordered execution when you want it:

```typescript
import { createScheduler, LoopPhase } from 'blecsd';

const scheduler = createScheduler();

scheduler.add(LoopPhase.UPDATE, (world, delta) => {
  // Game logic
  return world;
});

scheduler.add(LoopPhase.RENDER, (world, delta) => {
  // Drawing
  return world;
});

scheduler.start(world);
```

Phase execution order:

| Phase | Purpose |
|-------|---------|
| INPUT | Reserved for input processing (always first) |
| EARLY_UPDATE | Pre-update logic |
| UPDATE | Main game logic |
| LATE_UPDATE | Post-update logic |
| PHYSICS | Physics calculations |
| LAYOUT | UI layout calculations |
| RENDER | Drawing |
| POST_RENDER | Cleanup, debug overlays |

The INPUT phase is reserved and cannot be reordered. All other phases are optional.

## Event Bus

Type-safe event handling:

```typescript
import { createEventBus } from 'blecsd';

interface GameEvents {
  'player:moved': { x: number; y: number };
  'enemy:killed': { id: number; score: number };
}

const events = createEventBus<GameEvents>();

// Subscribe
const unsubscribe = events.on('player:moved', (e) => {
  console.log(`Player at ${e.x}, ${e.y}`);
});

// Emit
events.emit('player:moved', { x: 10, y: 5 });

// One-time listener
events.once('enemy:killed', (e) => {
  // Fires once, then auto-removes
});

// Cleanup
unsubscribe();
```

## State Machines

Attach FSMs to entities for state management:

```typescript
import { attachStateMachine, sendEvent, getState, isInState } from 'blecsd';

const enemyBehavior = {
  initial: 'idle',
  states: {
    idle: { on: { ALERT: 'chase' } },
    chase: { on: { LOST: 'search', CAUGHT: 'attack' } },
    search: { on: { FOUND: 'chase', TIMEOUT: 'idle' } },
    attack: { on: { DONE: 'idle' } },
  },
};

attachStateMachine(world, enemy, enemyBehavior);

// Transition
sendEvent(world, enemy, 'ALERT');
getState(world, enemy);     // 'chase'
isInState(world, enemy, 'chase');  // true
```

## Input Parsing

Parse terminal input sequences into structured events:

```typescript
import { parseKeyBuffer, parseMouseSequence } from 'blecsd';

// Keyboard
process.stdin.on('data', (buffer) => {
  const key = parseKeyBuffer(buffer);
  if (key) {
    console.log(key.name, key.ctrl, key.shift, key.meta);
  }
});

// Mouse (after enabling mouse tracking)
const mouse = parseMouseSequence('\x1b[<0;10;5M');
// { action: 'mousedown', button: 0, x: 10, y: 5, ... }
```

## Component Summary

| Component | Purpose | Key Functions |
|-----------|---------|---------------|
| Position | X, Y, Z coordinates | `setPosition`, `getPosition`, `moveBy` |
| Renderable | Colors, visibility | `setStyle`, `show`, `hide`, `markDirty` |
| Dimensions | Width, height | `setDimensions`, `setConstraints` |
| Hierarchy | Parent-child trees | `setParent`, `appendChild`, `getChildren` |
| Focusable | Keyboard focus | `focus`, `blur`, `focusNext`, `focusPrev` |
| Interactive | Mouse interaction | `setClickable`, `setHoverable`, `isPressed` |
| Scrollable | Scroll position | `scrollTo`, `scrollBy`, `getScrollPercentage` |
| Border | Box borders | `setBorder`, `getBorderChar` |
| Content | Text content | `setContent`, `getContent`, `appendContent` |
| Padding | Inner spacing | `setPadding`, `getPadding` |
| Label | Text labels | `setLabel`, `getLabelText` |

# Core Concepts

## Library, Not Framework

blECSd does not own your update loop or world. You can:

1. Use components in your own bitECS world
2. Skip the scheduler entirely
3. Use only the parts you need
4. Integrate with existing systems

```typescript
// Your own update loop
function updateLoop() {
  processInput();
  updateUI(world);
  render(world);
  requestAnimationFrame(updateLoop);
}

// blECSd components still work
import { setPosition, getPosition } from 'blecsd';
setPosition(world, panel, x, y);
```

## Entity Component System

blECSd uses [bitECS](https://github.com/NateTheGreatt/bitECS) for its ECS implementation. The pattern separates data (components) from behavior (systems).

### Entities

An entity is an integer ID with no data or behavior.

```typescript
import { createWorld, addEntity } from 'bitecs';

const world = createWorld();
const sidebar = addEntity(world);   // Returns an integer like 1
const mainPanel = addEntity(world); // Returns 2
```

### Components

Components are typed data stores. blECSd provides components for common UI needs:

```typescript
import { Position, Renderable, Dimensions } from 'blecsd';

// Components use Structure of Arrays (SoA) for performance
Position.x[sidebar] = 0;
Position.y[sidebar] = 0;
Renderable.fg[sidebar] = 0xffffffff;  // White foreground
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
| UPDATE | Main application logic |
| LATE_UPDATE | Post-update logic |
| ANIMATION | Physics-based animations, transitions, momentum |
| LAYOUT | UI layout calculations |
| RENDER | Drawing |
| POST_RENDER | Cleanup, debug overlays |

The INPUT phase is reserved and cannot be reordered. All other phases are optional.

**Note on ANIMATION phase:** This handles physics-based UI animations like spring dynamics, momentum scrolling, bounce effects, and smooth transitions. These patterns are common in modern UIs (iOS bounce, Material Design, kinetic scrolling) and equally useful for games.

## Event Bus

Type-safe event handling:

```typescript
import { createEventBus } from 'blecsd';

interface AppEvents {
  'panel:resized': { width: number; height: number };
  'file:selected': { path: string; name: string };
}

const events = createEventBus<AppEvents>();

// Subscribe
const unsubscribe = events.on('panel:resized', (e) => {
  console.log(`Panel is now ${e.width}x${e.height}`);
});

// Emit
events.emit('panel:resized', { width: 80, height: 24 });

// One-time listener
events.once('file:selected', (e) => {
  // Fires once, then auto-removes
});

// Cleanup
unsubscribe();
```

## State Machines

Attach FSMs to entities for state management:

```typescript
import { attachStateMachine, sendEvent, getState, isInState } from 'blecsd';

// Example: Modal dialog states
const modalBehavior = {
  initial: 'closed',
  states: {
    closed: { on: { OPEN: 'opening' } },
    opening: { on: { ANIMATION_DONE: 'open' } },
    open: { on: { CLOSE: 'closing', SUBMIT: 'submitting' } },
    closing: { on: { ANIMATION_DONE: 'closed' } },
    submitting: { on: { SUCCESS: 'closing', ERROR: 'open' } },
  },
};

attachStateMachine(world, dialog, modalBehavior);

// Transition
sendEvent(world, dialog, 'OPEN');
getState(world, dialog);     // 'opening'
isInState(world, dialog, 'opening');  // true
```

State machines are useful for UI workflows, form validation states, loading indicators, and any element with discrete states.

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

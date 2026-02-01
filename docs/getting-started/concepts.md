# Core Concepts

Understand the architecture that makes blECSd fast and flexible.

## Prerequisites

- [Hello World](./hello-world.md) complete

## The Big Picture

blECSd is built on three core ideas:

1. **Input First** - Input is always processed before anything else
2. **Entity Component System (ECS)** - Data and logic are separated
3. **Game Loop** - Everything runs in a predictable, frame-based cycle

## Input First

This is the most important principle. In a game, input must feel responsive. blECSd guarantees:

- All pending input is processed at the start of every frame
- No input events are ever lost or delayed
- Input processing cannot be reordered by library users

The game loop always runs in this order:

```
1. INPUT         <-- Always first, cannot be moved
2. EARLY_UPDATE
3. UPDATE
4. LATE_UPDATE
5. PHYSICS
6. LAYOUT
7. RENDER
8. POST_RENDER
```

You can add custom code to any phase except INPUT, which is reserved.

## Entity Component System

ECS separates "what things are" (entities + components) from "what things do" (systems).

### Entities

An entity is just an ID. It has no data or behavior on its own.

```typescript
const player = game.createEntity();
const enemy = game.createEntity();
```

### Components

Components are pure data. They describe properties of an entity.

```typescript
// Position data
Position.x[player] = 10;
Position.y[player] = 5;

// Velocity data
Velocity.x[player] = 1;
Velocity.y[player] = 0;

// What to render
Renderable.char[player] = '@'.charCodeAt(0);
Renderable.fg[player] = 0xffffff;
```

### Systems

Systems contain logic. They process entities that have specific components.

```typescript
// This system moves all entities that have Position and Velocity
const movementSystem = defineSystem((world) => {
  const entities = movementQuery(world);
  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];
  }
  return world;
});
```

### Why ECS?

| Traditional OOP | ECS |
|----------------|-----|
| Deep inheritance hierarchies | Flat composition |
| Behavior scattered across classes | Logic centralized in systems |
| Hard to add new behaviors | Add a component, write a system |
| Memory scattered | Cache-friendly data layout |

ECS shines for games because:
- Adding new features is easy (new component + new system)
- Performance is predictable
- Debugging is straightforward (inspect component data)

## The Game Loop

blECSd runs at 60fps by default. Each frame:

```
┌─────────────────────────────────────┐
│  Frame Start                        │
├─────────────────────────────────────┤
│  1. Process ALL pending input       │
│  2. Run early update systems        │
│  3. Run main update systems         │
│  4. Run late update systems         │
│  5. Run physics systems             │
│  6. Calculate layouts               │
│  7. Render to screen buffer         │
│  8. Flush buffer to terminal        │
│  9. Run post-render callbacks       │
├─────────────────────────────────────┤
│  Wait for next frame (~16.67ms)     │
└─────────────────────────────────────┘
```

### Hooking Into the Loop

```typescript
// Run every frame
game.onUpdate((deltaTime) => {
  // deltaTime is seconds since last frame
  player.x += speed * deltaTime;
});

// Run at fixed intervals (good for physics)
game.onFixedUpdate((fixedDelta) => {
  // fixedDelta is always the same (default: 1/60)
  applyGravity(fixedDelta);
});

// Run after rendering
game.onRender(() => {
  // Good for debug overlays
});
```

## Simple vs Advanced API

blECSd offers two ways to work:

### Simple API (Recommended for Most Users)

Use the `Game` class methods. Components and systems are managed for you.

```typescript
const game = createGame({ title: 'My Game' });

// createBox() creates an entity with Position, Dimensions,
// Renderable, and Box components automatically
const box = game.createBox({ x: 10, y: 5, width: 20, height: 10 });

// Methods operate on the underlying entity
box.move(1, 0);
box.setContent('New content');
```

### Advanced API (Full ECS Control)

Access the raw ECS world and create custom components/systems.

```typescript
import { createWorld, addEntity, addComponent, defineQuery, defineSystem } from 'blecsd';
import { Position, Velocity, Renderable } from 'blecsd';

// Create your own component
const Health = defineComponent({ current: Types.ui16, max: Types.ui16 });

// Create your own system
const healthSystem = defineSystem((world) => {
  const entities = healthQuery(world);
  for (const eid of entities) {
    if (Health.current[eid] <= 0) {
      removeEntity(world, eid);
    }
  }
  return world;
});

// Register with the game
game.addSystem(healthSystem, 'UPDATE');
```

## Widgets vs Entities

Widgets are convenient wrappers around entities:

| Widget | Underlying Components |
|--------|----------------------|
| `Box` | Position, Dimensions, Renderable, BoxStyle |
| `Text` | Position, Dimensions, Renderable, TextContent |
| `Sprite` | Position, Sprite, Animation |
| `Button` | Position, Dimensions, Renderable, Clickable, BoxStyle |

You can access the underlying entity from any widget:

```typescript
const box = game.createBox({ x: 0, y: 0, width: 10, height: 5 });

// Get the entity ID
const eid = box.eid;

// Access components directly
Position.x[eid] = 100;
```

## Common Mistakes

### Mutating state outside systems

```typescript
// DON'T do this - bypasses ECS
game.onKey('space', () => {
  Position.x[player]++; // Direct mutation
});

// DO this - use systems or widget methods
game.onKey('space', () => {
  playerWidget.move(1, 0);
});
```

### Creating entities every frame

```typescript
// DON'T do this - memory leak
game.onUpdate(() => {
  game.createBox({ ... }); // New entity every frame!
});

// DO this - create once, update many
const box = game.createBox({ ... });
game.onUpdate(() => {
  box.move(1, 0);
});
```

### Blocking in update handlers

```typescript
// DON'T do this - blocks the game loop
game.onUpdate(async () => {
  const data = await fetchData(); // Blocks everything!
});

// DO this - fire and forget, update on completion
game.onUpdate(() => {
  if (needsData && !loading) {
    loading = true;
    fetchData().then(data => {
      loading = false;
      processData(data);
    });
  }
});
```

## Next Steps

- [First Game](./first-game.md) - Apply these concepts to build Snake
- [ECS Basics Guide](../guides/ecs-basics.md) - Deep dive into ECS
- [Input Handling Guide](../guides/input-handling.md) - Advanced input patterns

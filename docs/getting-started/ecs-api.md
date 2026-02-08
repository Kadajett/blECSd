# Getting Started with the ECS API

This guide shows you how to build your first application using blECSd's **low-level ECS API** - a powerful, flexible interface for building custom frameworks, tools, and complex terminal UIs.

## What is the ECS API?

The ECS API gives you direct control over the Entity Component System:

- ✅ **Maximum flexibility** - full control over entities, components, and systems
- ✅ **Custom system pipelines** - build exactly the flow you need
- ✅ **Performance control** - optimize for your specific use case
- ✅ **Framework building** - create your own abstractions on top

**Best for**: TUI frameworks, tools, IDEs, file managers, complex applications

**Requires**: Understanding of ECS concepts (entities, components, systems)

**New to ECS?** Read [Understanding ECS](../guides/understanding-ecs.md) first.

## Your First Application

### 1. Create a World

```typescript
import { createWorld } from 'blecsd';

const world = createWorld();
```

The world holds all entities, components, and state.

### 2. Create the Screen Entity

```typescript
import { createScreenEntity } from 'blecsd';

const screen = createScreenEntity(world, {
  width: 80,
  height: 24,
  title: 'My Application',
});
```

The screen is the root entity that represents the terminal viewport.

### 3. Create UI Elements

```typescript
import { createBoxEntity, createTextEntity, BorderType } from 'blecsd';

// Container box
const container = createBoxEntity(world, {
  x: 10,
  y: 5,
  width: 60,
  height: 15,
  border: {
    type: BorderType.Line,
    left: true,
    right: true,
    top: true,
    bottom: true,
  },
});

// Title text
const title = createTextEntity(world, {
  parent: container,
  x: 2,
  y: 1,
  text: 'Hello, ECS API!',
  fg: 0xffffffff,
});
```

### 4. Define Systems

Systems process entities with specific components:

```typescript
import { defineQuery, Position, Velocity } from 'blecsd';
import type { World } from 'blecsd';

// Query for entities with Position and Velocity
const movableEntities = defineQuery([Position, Velocity]);

// System that moves entities
function movementSystem(world: World): World {
  const entities = movableEntities(world);

  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];
  }

  return world;
}
```

### 5. Set Up the Game Loop

```typescript
import { createGameLoop, LoopPhase } from 'blecsd';

const loop = createGameLoop(world, {
  targetFPS: 60,
});

// Register systems in specific phases
loop.registerSystem(LoopPhase.INPUT, inputSystem);
loop.registerSystem(LoopPhase.UPDATE, movementSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);

// Start the loop
loop.start();
```

See [System Execution Order](../guides/system-execution-order.md) for phase details.

## Complete Example: Interactive Box

```typescript
import {
  createWorld,
  createScreenEntity,
  createBoxEntity,
  createGameLoop,
  LoopPhase,
  BorderType,
  Position,
} from 'blecsd';
import type { World, System } from 'blecsd';

// Create world and screen
const world = createWorld();
const screen = createScreenEntity(world, {
  width: 80,
  height: 24,
});

// Create a box
const box = createBoxEntity(world, {
  x: 35,
  y: 10,
  width: 10,
  height: 5,
  fg: 0x00ff00ff,
  border: { type: BorderType.Line },
});

// Input system
function inputSystem(world: World): World {
  // Read keyboard input
  const keys = getInputState(world);

  if (keys.has('up')) Position.y[box] = Math.max(0, Position.y[box] - 1);
  if (keys.has('down')) Position.y[box] = Math.min(19, Position.y[box] + 1);
  if (keys.has('left')) Position.x[box] = Math.max(0, Position.x[box] - 1);
  if (keys.has('right')) Position.x[box] = Math.min(70, Position.x[box] + 1);

  if (keys.has('q')) {
    process.exit(0);
  }

  return world;
}

// Render system (simplified - actual rendering omitted for brevity)
function renderSystem(world: World): World {
  // Clear screen
  // Render all visible entities
  // Flush to terminal
  return world;
}

// Create game loop
const loop = createGameLoop(world, { targetFPS: 30 });

loop.registerSystem(LoopPhase.INPUT, inputSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);

loop.start();
```

## Core Concepts

### Entities are IDs

Entities are just numbers:

```typescript
import { addEntity } from 'blecsd';

const entity = addEntity(world);
console.log(typeof entity); // "number"
```

### Components are Data

Components are typed arrays:

```typescript
import { Position, Dimensions } from 'blecsd';

const box = addEntity(world);
Position.x[box] = 10;
Position.y[box] = 5;
Dimensions.width[box] = 40;
Dimensions.height[box] = 10;
```

### Systems are Functions

Systems transform world state:

```typescript
function mySystem(world: World): World {
  // Process entities
  return world;
}
```

## Working with Components

### Adding Components

```typescript
import { addComponent, Position, Velocity } from 'blecsd';

const entity = addEntity(world);

// Add components
addComponent(world, entity, Position);
addComponent(world, entity, Velocity);

// Set values
Position.x[entity] = 10;
Position.y[entity] = 5;
Velocity.x[entity] = 2;
Velocity.y[entity] = 0;
```

### Removing Components

```typescript
import { removeComponent, Velocity } from 'blecsd';

// Stop entity from moving
removeComponent(world, entity, Velocity);
```

### Checking Components

```typescript
import { hasComponent, Position } from 'blecsd';

if (hasComponent(world, entity, Position)) {
  console.log('Entity has a position');
}
```

## Querying Entities

### Define Queries

```typescript
import { defineQuery, Position, Velocity, Renderable } from 'blecsd';

// Entities with Position and Velocity
const movableEntities = defineQuery([Position, Velocity]);

// Entities with Position and Renderable
const visibleEntities = defineQuery([Position, Renderable]);
```

### Use Queries in Systems

```typescript
function renderSystem(world: World): World {
  const entities = visibleEntities(world);

  for (const eid of entities) {
    const x = Position.x[eid];
    const y = Position.y[eid];
    const char = Renderable.char[eid];
    const fg = Renderable.fg[eid];

    // Draw entity at position
    draw(x, y, char, fg);
  }

  return world;
}
```

## System Registration

Systems run in phases:

```typescript
import { createGameLoop, LoopPhase } from 'blecsd';

const loop = createGameLoop(world, { targetFPS: 60 });

// INPUT phase (automatic, but you can add custom input handling)
loop.registerSystem(LoopPhase.INPUT, parseInputSystem);

// EARLY_UPDATE phase
loop.registerSystem(LoopPhase.EARLY_UPDATE, prepareLogicSystem);

// UPDATE phase (main game logic)
loop.registerSystem(LoopPhase.UPDATE, movementSystem);
loop.registerSystem(LoopPhase.UPDATE, collisionSystem);

// LATE_UPDATE phase (dependent logic)
loop.registerSystem(LoopPhase.LATE_UPDATE, cameraFollowSystem);

// ANIMATION phase (physics, tweens)
loop.registerSystem(LoopPhase.ANIMATION, physicsSystem);

// LAYOUT phase (UI layout)
loop.registerSystem(LoopPhase.LAYOUT, layoutSystem);

// RENDER phase (drawing)
loop.registerSystem(LoopPhase.RENDER, renderSystem);

// POST_RENDER phase (debug overlays)
loop.registerSystem(LoopPhase.POST_RENDER, debugSystem);

loop.start();
```

See [System Execution Order](../guides/system-execution-order.md) for details.

## Example: Moving Particles

```typescript
import {
  createWorld,
  createGameLoop,
  addEntity,
  addComponent,
  defineQuery,
  Position,
  Velocity,
  LoopPhase,
} from 'blecsd';
import type { World } from 'blecsd';

const world = createWorld();

// Create 100 particles
for (let i = 0; i < 100; i++) {
  const particle = addEntity(world);

  addComponent(world, particle, Position);
  addComponent(world, particle, Velocity);

  Position.x[particle] = Math.random() * 80;
  Position.y[particle] = Math.random() * 24;

  Velocity.x[particle] = (Math.random() - 0.5) * 2;
  Velocity.y[particle] = (Math.random() - 0.5) * 2;
}

// Movement system
const movableEntities = defineQuery([Position, Velocity]);

function movementSystem(world: World): World {
  const entities = movableEntities(world);

  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];

    // Wrap around screen
    if (Position.x[eid] < 0) Position.x[eid] = 80;
    if (Position.x[eid] > 80) Position.x[eid] = 0;
    if (Position.y[eid] < 0) Position.y[eid] = 24;
    if (Position.y[eid] > 24) Position.y[eid] = 0;
  }

  return world;
}

// Render system (simplified)
function renderSystem(world: World): World {
  const entities = movableEntities(world);

  // Clear screen
  console.clear();

  for (const eid of entities) {
    const x = Math.floor(Position.x[eid]);
    const y = Math.floor(Position.y[eid]);
    // Draw particle at (x, y)
  }

  return world;
}

// Game loop
const loop = createGameLoop(world, { targetFPS: 30 });

loop.registerSystem(LoopPhase.UPDATE, movementSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);

loop.start();
```

## Helper Functions

blECSd provides helper functions for common operations:

```typescript
import {
  setPosition,
  getPosition,
  setDimensions,
  getDimensions,
  setContent,
  getContent,
  moveBy,
  resizeBy,
} from 'blecsd';

// Set position
setPosition(world, entity, 10, 5);

// Get position
const pos = getPosition(world, entity);
console.log(`Position: (${pos.x}, ${pos.y})`);

// Move relative
moveBy(world, entity, 5, 0); // Move right 5 units

// Set dimensions
setDimensions(world, entity, 40, 10);

// Set content
setContent(world, entity, 'Hello, World!');
```

## Parent-Child Hierarchies

```typescript
import { setParent, getChildren } from 'blecsd';

const parent = createBoxEntity(world, { x: 10, y: 5, width: 50, height: 20 });
const child1 = createBoxEntity(world, { x: 2, y: 2, width: 20, height: 5 });
const child2 = createBoxEntity(world, { x: 2, y: 8, width: 20, height: 5 });

// Attach children to parent
setParent(world, child1, parent);
setParent(world, child2, parent);

// Get all children
const children = getChildren(world, parent);
for (const childEid of children) {
  console.log(`Child: ${childEid}`);
}
```

## Next Steps

- **Read**: [Understanding ECS](../guides/understanding-ecs.md) - ECS concepts
- **Read**: [System Execution Order](../guides/system-execution-order.md) - Loop phases
- **Read**: [Coordinate System](../api/coordinate-system.md) - Positioning guide
- **Reference**: [Entity Factories](../api/entities.md) - Entity creation API
- **Reference**: [Components](../api/components.md) - Component reference
- **Reference**: [Game Loop](../api/game-loop.md) - Loop API

## Common Patterns

### Collision Detection System

```typescript
const colliderQuery = defineQuery([Position, Dimensions, Collider]);

function collisionSystem(world: World): World {
  const entities = colliderQuery(world);

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];

      if (checkCollision(a, b)) {
        // Handle collision
        handleCollision(world, a, b);
      }
    }
  }

  return world;
}
```

### Camera Follow System

```typescript
function cameraFollowSystem(world: World): World {
  const player = getPlayerEntity(world);
  const camera = getCameraEntity(world);

  if (!player || !camera) return world;

  // Center camera on player
  Position.x[camera] = Position.x[player] - (Dimensions.width[camera] / 2);
  Position.y[camera] = Position.y[player] - (Dimensions.height[camera] / 2);

  return world;
}

// Register in LATE_UPDATE (after player moves in UPDATE)
loop.registerSystem(LoopPhase.LATE_UPDATE, cameraFollowSystem);
```

### Cleanup System

```typescript
const markedForDeletion = defineQuery([MarkedForDeletion]);

function cleanupSystem(world: World): World {
  const entities = markedForDeletion(world);

  for (const eid of entities) {
    removeEntity(world, eid);
  }

  return world;
}

// Register in POST_RENDER (after all other systems)
loop.registerSystem(LoopPhase.POST_RENDER, cleanupSystem);
```

## Summary

The ECS API provides:

- ✅ Direct access to entities, components, and systems
- ✅ Custom system pipelines with phases
- ✅ Maximum flexibility and performance
- ✅ Framework-building capabilities
- ❌ More boilerplate than Game API
- ❌ Requires ECS knowledge

**Perfect for**: Custom frameworks, tools, complex UIs, maximum control

**Not ideal for**: Quick prototypes, beginners, simple games

For a simpler API, see the [Game API Getting Started](./game-api.md).

# Getting Started with the ECS API

This guide shows you how to build your first application using blECSd's **low-level ECS API**, a powerful, flexible interface for building custom frameworks, tools, and complex terminal UIs.

## What is the ECS API?

The ECS API gives you direct control over the Entity Component System:

- Maximum flexibility: full control over entities, components, and systems
- Custom system pipelines: build exactly the flow you need
- Performance control: optimize for your specific use case
- Framework building: create your own abstractions on top

**Best for**: TUI frameworks, tools, IDEs, file managers, complex applications

**Requires**: Understanding of ECS concepts (entities, components, systems)

**New to ECS?** Read [Understanding ECS](../guides/understanding-ecs.md) first.

## Your First Application

### 1. Create a World

```typescript
import { createWorld } from 'blecsd/core';

const world = createWorld();
```

The world holds all entities, components, and state.

### 2. Create the Screen Entity

```typescript
import { createWorld, createScreenEntity } from 'blecsd/core';

const world = createWorld();
const screen = createScreenEntity(world, {
  width: 80,
  height: 24,
  title: 'My Application',
});
void screen;
```

The screen is the root entity that represents the terminal viewport.

### 3. Create UI Elements

```typescript
import { createWorld, createBoxEntity, createTextEntity } from 'blecsd/core';
import { BorderType } from 'blecsd/components';

const world = createWorld();

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
void title;
```

### 4. Define Systems

Systems process entities with specific components:

```typescript
import { createWorld, query } from 'blecsd/core';
import { Position, Velocity } from 'blecsd/components';
import type { World } from 'blecsd/core';

const world = createWorld();

// System that moves entities
function movementSystem(world: World): World {
  // Query for entities with Position and Velocity
  const entities = query(world, [Position, Velocity]);

  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];
  }

  return world;
}
void movementSystem;
```

### 5. Set Up the Game Loop

```typescript
import { createWorld } from 'blecsd/core';
import { createGameLoop, LoopPhase } from 'blecsd/core';
import { query } from 'blecsd/core';
import { Position, Velocity } from 'blecsd/components';
import type { World } from 'blecsd/core';

const world = createWorld();

// Define a system
function movementSystem(world: World): World {
  const entities = query(world, [Position, Velocity]);
  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];
  }
  return world;
}

const loop = createGameLoop(world, {
  targetFPS: 60,
});

// Register systems in specific phases
// Note: INPUT phase is protected and populated automatically
loop.registerSystem(LoopPhase.UPDATE, movementSystem);

// Start the loop
loop.start();
loop.stop();  // Stop immediately after starting in this example
```

See [System Execution Order](../guides/system-execution-order.md) for phase details.

## Complete Example: Interactive Box

```typescript
import { createWorld, createScreenEntity, createBoxEntity, addComponent } from 'blecsd/core';
import { createGameLoop, LoopPhase, query } from 'blecsd/core';
import { Position, Velocity, BorderType } from 'blecsd/components';
import type { World } from 'blecsd/core';

// Create world and screen
const world = createWorld();
const screen = createScreenEntity(world, {
  width: 80,
  height: 24,
});

// Create a box with velocity
const box = createBoxEntity(world, {
  x: 35,
  y: 10,
  width: 10,
  height: 5,
  fg: 0x00ff00ff,
  border: { type: BorderType.Line },
});

addComponent(world, box, Velocity);
Velocity.x[box] = 1;
Velocity.y[box] = 0;

// Movement system
function movementSystem(world: World): World {
  const entities = query(world, [Position, Velocity]);

  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];

    // Bounce off walls
    if (Position.x[eid] < 0 || Position.x[eid] > 70) {
      Velocity.x[eid] *= -1;
    }
    if (Position.y[eid] < 0 || Position.y[eid] > 19) {
      Velocity.y[eid] *= -1;
    }
  }

  return world;
}

// Create game loop
const loop = createGameLoop(world, { targetFPS: 30 });

loop.registerSystem(LoopPhase.UPDATE, movementSystem);

loop.start();
loop.stop();
```

## Core Concepts

### Entities are IDs

Entities are just numbers:

```typescript
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
console.log(typeof entity); // "number"
```

### Components are Data

Components are typed arrays. Import them from `blecsd/components`:

```typescript
import { createWorld, addEntity, addComponent } from 'blecsd/core';
import { Position, Dimensions } from 'blecsd/components';

const world = createWorld();
const box = addEntity(world);
addComponent(world, box, Position);
addComponent(world, box, Dimensions);

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
import { createWorld, addEntity, addComponent } from 'blecsd/core';
import { Position, Velocity } from 'blecsd/components';

const world = createWorld();
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
import { createWorld, addEntity, addComponent, removeComponent } from 'blecsd/core';
import { Velocity } from 'blecsd/components';

const world = createWorld();
const entity = addEntity(world);
addComponent(world, entity, Velocity);

// Stop entity from moving
removeComponent(world, entity, Velocity);
```

### Checking Components

```typescript
import { createWorld, addEntity, addComponent, hasComponent } from 'blecsd/core';
import { Position } from 'blecsd/components';

const world = createWorld();
const entity = addEntity(world);
addComponent(world, entity, Position);

if (hasComponent(world, entity, Position)) {
  console.log('Entity has a position');
}
```

## Querying Entities

### Use Queries in Systems

Queries are created using the `query` function from `blecsd/core`:

```typescript
import { createWorld, query } from 'blecsd/core';
import { Position, Renderable } from 'blecsd/components';
import type { World } from 'blecsd/core';

const world = createWorld();

function myRenderSystem(world: World): World {
  // Query entities with Position and Renderable
  const entities = query(world, [Position, Renderable]);

  for (const eid of entities) {
    const x = Position.x[eid];
    const y = Position.y[eid];
    const fg = Renderable.fg[eid];

    // Draw entity at position
    void x; void y; void fg;
  }

  return world;
}

myRenderSystem(world);
```

## System Registration

Systems run in phases:

```typescript
import { createWorld } from 'blecsd/core';
import { createGameLoop, LoopPhase } from 'blecsd/core';
import { layoutSystem, renderSystem, outputSystem, movementSystem, collisionSystem, animationSystem } from 'blecsd/systems';

const world = createWorld();
const loop = createGameLoop(world, { targetFPS: 60 });

// INPUT phase runs automatically - you cannot register systems to it

// EARLY_UPDATE phase (no built-in system shown here - use your own)

// UPDATE phase (main game logic)
loop.registerSystem(LoopPhase.UPDATE, movementSystem);
loop.registerSystem(LoopPhase.UPDATE, collisionSystem);

// ANIMATION phase (physics, tweens)
loop.registerSystem(LoopPhase.ANIMATION, animationSystem);

// LAYOUT phase (UI layout)
loop.registerSystem(LoopPhase.LAYOUT, layoutSystem);

// RENDER phase (drawing)
loop.registerSystem(LoopPhase.RENDER, renderSystem);

// POST_RENDER phase (output + debug)
loop.registerSystem(LoopPhase.POST_RENDER, outputSystem);

loop.start();
loop.stop();
```

See [System Execution Order](../guides/system-execution-order.md) for details.

## Example: Moving Particles

```typescript
import { createWorld, addEntity, addComponent } from 'blecsd/core';
import { createGameLoop, LoopPhase, query } from 'blecsd/core';
import { Position, Velocity } from 'blecsd/components';
import type { World } from 'blecsd/core';

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
function movementSystem(world: World): World {
  const entities = query(world, [Position, Velocity]);

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
function particleRenderSystem(world: World): World {
  const entities = query(world, [Position, Velocity]);

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
loop.registerSystem(LoopPhase.RENDER, particleRenderSystem);

loop.start();
loop.stop();
```

## Helper Functions

blECSd provides helper functions so you don't have to work with raw component arrays:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, getPosition, setDimensions } from 'blecsd/components';
import { setContent, getContent, moveBy } from 'blecsd/components';

const world = createWorld();
const entity = addEntity(world);

// Set position (from main blecsd)
setPosition(world, entity, 10, 5);

// Get position
const pos = getPosition(world, entity);
console.log(`Position: (${pos?.x}, ${pos?.y})`);

// Move relative (from blecsd/components)
moveBy(world, entity, 5, 0); // Move right 5 units

// Set dimensions (from main blecsd)
setDimensions(world, entity, 40, 10);

// Set content (from blecsd/components)
setContent(world, entity, 'Hello, World!');
```

## Parent-Child Hierarchies

```typescript
import { createWorld, createBoxEntity } from 'blecsd/core';
import { setParent, getChildren } from 'blecsd/components';

const world = createWorld();

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
- **Read**: [Coordinate System](../api/positioning.md) - Positioning guide
- **Reference**: [Entity Factories](../api/entities.md) - Entity creation API
- **Reference**: Components - Component reference
- **Reference**: [Game Loop](../api/core/gameLoop.md) - Loop API

## Common Patterns

### Collision Detection System

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { query } from 'blecsd/core';
import { Position, Dimensions } from 'blecsd/components';
import type { World } from 'blecsd/core';

const world = createWorld();

function checkCollision(a: number, b: number): boolean {
  // Check AABB overlap
  const ax = Position.x[a], ay = Position.y[a];
  const aw = Dimensions.width[a], ah = Dimensions.height[a];
  const bx = Position.x[b], by = Position.y[b];
  const bw = Dimensions.width[b], bh = Dimensions.height[b];
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function handleCollision(_world: World, _a: number, _b: number): void {
  // Handle collision logic
}

function collisionSystem(world: World): World {
  const entities = query(world, [Position, Dimensions]);

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
void collisionSystem;
```

### Camera Follow System

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createGameLoop, LoopPhase } from 'blecsd/core';
import { Position, Dimensions } from 'blecsd/components';
import type { World } from 'blecsd/core';

const world = createWorld();
const playerEntity = addEntity(world);
const cameraEntity = addEntity(world);

function getPlayerEntity(_world: World): number { return playerEntity; }
function getCameraEntity(_world: World): number { return cameraEntity; }

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
const loop = createGameLoop(world, { targetFPS: 60 });
loop.registerSystem(LoopPhase.LATE_UPDATE, cameraFollowSystem);
loop.start();
loop.stop();
```

### Cleanup System

```typescript
import { createWorld, addEntity, removeEntity } from 'blecsd/core';
import { createGameLoop, LoopPhase, query } from 'blecsd/core';
import { Velocity } from 'blecsd/components';
import type { World } from 'blecsd/core';

const world = createWorld();

// Example: remove entities that have Velocity = 0 (stopped)
function cleanupSystem(world: World): World {
  const entities = query(world, [Velocity]);

  for (const eid of entities) {
    if (Velocity.x[eid] === 0 && Velocity.y[eid] === 0) {
      removeEntity(world, eid);
    }
  }

  return world;
}

// Create loop and register in POST_RENDER (after all other systems)
const loop = createGameLoop(world, { targetFPS: 60 });
loop.registerSystem(LoopPhase.POST_RENDER, cleanupSystem);
loop.start();
loop.stop();
```

## Namespace API

As your application grows, you may want to organize imports using namespace objects. blECSd provides namespace imports from subpaths like `blecsd/components`, `blecsd/systems`, `blecsd/terminal`, and `blecsd/utils`.

### Why Use Namespaces?

Namespace imports help with:
- Organizing related functions by domain
- Reducing naming conflicts in larger codebases
- Making code more maintainable and searchable
- Creating clearer boundaries between different parts of your application

### Component Namespaces

Instead of importing many individual functions:

```typescript
import { setPosition, getPosition, setDimensions, getDimensions } from 'blecsd/components';
import { setContent, getText, moveBy } from 'blecsd/components';
```

Use component namespaces:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { position, dimensions, content } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);

// Position operations
position.set(world, eid, 10, 5);
const pos = position.get(world, eid);
position.moveBy(world, eid, 2, 0);

// Dimensions operations
dimensions.set(world, eid, 40, 10);
const size = dimensions.get(world, eid);

// Content operations
content.setText(world, eid, 'Hello, World!');
const text = content.getText(world, eid);
void pos; void size; void text;
```

### System Namespaces

Systems can also be imported as namespaces:

```typescript
import { createWorld } from 'blecsd/core';
import { layout, render, animationSystem } from 'blecsd/systems';
import type { World } from 'blecsd/core';

const world = createWorld();

function gameLoop(world: World): void {
  // Update animations
  animationSystem(world);

  // Calculate layout
  layout.system(world);

  // Render to buffer
  render.system(world);
}

gameLoop(world);
```

### Terminal Namespaces

For terminal operations, use `createProgram` for high-level control:

```typescript
import { createProgram } from 'blecsd/terminal';

const program = createProgram();
// program.init();  // Call in real apps to initialize terminal

// Cursor control
program.hideCursor();
program.move(10, 5);
program.write('Hello');
program.showCursor();

// Cleanup
program.destroy();
```

For low-level ANSI escape sequences, use the `ansiCodes` namespace:

```typescript
import { ansiCodes } from 'blecsd/terminal';

// Generate escape sequences (returns strings)
const hide = ansiCodes.cursor.hide();
const move = ansiCodes.cursor.move(10, 5);
const clear = ansiCodes.screen.clear();
void hide; void move; void clear;
```

### Mixing Approaches

You can mix flat imports and namespace imports freely:

```typescript
// Core ECS always from 'blecsd'
import { createWorld, addEntity } from 'blecsd/core';

// Namespaces for organization
import { position, dimensions } from 'blecsd/components';
import { layout, animationSystem } from 'blecsd/systems';

const world = createWorld();
const eid = addEntity(world);

// Use both styles
position.set(world, eid, 10, 5);
dimensions.set(world, eid, 40, 10);

// Systems
animationSystem(world);
layout.system(world);
```

### Complete Example with Namespaces

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createGameLoop, LoopPhase } from 'blecsd/core';
import { position, dimensions, velocity } from 'blecsd/components';
import { layout, render, animationSystem } from 'blecsd/systems';
import { createProgram } from 'blecsd/terminal';
import type { World } from 'blecsd/core';

// Create world
const world = createWorld();

// Create entities
for (let i = 0; i < 10; i++) {
  const particle = addEntity(world);

  position.set(world, particle, Math.random() * 80, Math.random() * 24);
  dimensions.set(world, particle, 1, 1);
  velocity.set(world, particle, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
}

// Custom movement system using namespace functions
function movementSystem(world: World): World {
  // Get all entities with velocity (using has check)
  const entities = [];
  for (let eid = 0; eid < 10000; eid++) {
    if (velocity.has(world, eid) && position.has(world, eid)) {
      entities.push(eid);
    }
  }

  for (const eid of entities) {
    const pos = position.get(world, eid);
    const vel = velocity.get(world, eid);

    if (pos && vel) {
      position.set(world, eid, pos.x + vel.x, pos.y + vel.y);
    }
  }

  return world;
}

// Setup terminal
const program = createProgram();
// program.init();  // Call in real apps

// Create game loop
const loop = createGameLoop(world, { targetFPS: 30 });

loop.registerSystem(LoopPhase.UPDATE, movementSystem);
loop.registerSystem(LoopPhase.ANIMATION, animationSystem);
loop.registerSystem(LoopPhase.LAYOUT, layout.system);
loop.registerSystem(LoopPhase.RENDER, render.system);

loop.start();
loop.stop();  // Stop immediately in this example

// Cleanup on exit
process.on('SIGINT', () => {
  loop.stop();
  program.destroy();
  process.exit(0);
});
```

Note: Namespace imports work best with helper functions like `set()`, `get()`, `has()`. For queries that need component objects, import component stores directly from `blecsd/components`.

### Namespace Reference

Available namespace subpaths:

| Subpath | Contains |
|---------|----------|
| `blecsd/components` | Component namespaces (position, dimensions, content, border, scroll, focus, etc.) |
| `blecsd/systems` | System namespaces (animation, layout, render, input, output, collision, etc.) |
| `blecsd/terminal` | Terminal namespaces (ansiCodes, cursor, screen, program, graphics, etc.) |
| `blecsd/utils` | Utility namespaces (rope, textWrap, unicode, fuzzySearch, syntaxHL, etc.) |
| `blecsd/core` | Core functions (createGameLoop, createScheduler, createEventBus, query, etc.) |

See the [Export Patterns Guide](../guides/export-patterns.md) for more details on the three-tier export system.

## Summary

The ECS API provides:

- Direct access to entities, components, and systems
- Custom system pipelines with phases
- Maximum flexibility and performance
- Framework-building capabilities

**Perfect for**: Custom frameworks, tools, complex UIs, maximum control

**Not ideal for**: Quick prototypes, beginners, simple games

For a simpler API, see the [Game API Getting Started](./ecs-api.md).
